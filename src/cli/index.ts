#!/usr/bin/env node
import 'dotenv/config';
import { createInterface } from 'readline';
import { Command } from 'commander';
import { simpleGit } from 'simple-git';
import { getCommits } from '../git/log.js';
import { getDiffsForCommits } from '../git/diff.js';
import {
  getWorkingDiff,
  type WorkingDiffMode,
} from '../git/working-diff.js';
import { formatCommitList } from '../utils/format.js';
import { summarize, generateCommitMessage } from '../ai/summarize.js';
import {
  formatReportTitle,
  fallbackReport,
} from '../report/generate.js';

function dayRange(dateStr: string): { since: string; until: string } {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  if (Number.isNaN(d.getTime())) {
    throw new Error(`无效日期: ${dateStr}，请使用 YYYY-MM-DD`);
  }
  const since = d.toISOString();
  const until = new Date(d.getTime() + 86400000).toISOString();
  return { since, until };
}

function todayRange(): { since: string; until: string } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const until = new Date(start.getTime() + 86400000).toISOString();
  return { since: start.toISOString(), until };
}

function weekRange(): { since: string; until: string } {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // 周一为一周开始
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff)
  );
  const since = new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate())
  ).toISOString();
  const until = new Date(now.getTime() + 86400000).toISOString();
  return { since, until };
}

function monthRange(): { since: string; until: string } {
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
  const until = new Date(now.getTime() + 86400000).toISOString();
  return { since, until };
}

/** 展示用：去掉「建议的 commit message」标题行及与交互提示相关的条目 */
function filterCommitMessageDisplay(msg: string): string {
  return msg
    .split('\n')
    .filter((line) => !line.includes('统一提交确认提示'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function runReport(
  repo: string,
  since: string,
  until: string,
  promptName: 'daily' | 'weekly' | 'monthly',
  titleKind: 'today' | 'day' | 'week' | 'month'
): Promise<void> {
  const commits = await getCommits(repo, since, until);
  process.stdout.write(formatReportTitle(titleKind));
  if (commits.length === 0) {
    process.stdout.write('（所选时间范围内无 commit）\n');
    return;
  }
  const commitList = formatCommitList(commits);
  let report: string;
  try {
    const diffBlock = await getDiffsForCommits(repo, commits);
    report = await summarize(promptName, commitList, diffBlock);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes('WORKLOG_API_KEY') ||
      msg.includes('OPENAI_API_KEY') ||
      msg.includes('DEEPSEEK_API_KEY')
    ) {
      report = fallbackReport(commits.map((c) => c.message));
      process.stderr.write('提示: ' + msg + '\n');
    } else {
      throw e;
    }
  }
  process.stdout.write('\n' + report + '\n');
}

const program = new Command();
program
  .name('worklog')
  .description('根据 Git commit 与 diff 用 AI 生成工作日报/周报/月报')
  .version('0.1.0');

function applyProvider(provider?: string): void {
  if (provider) {
    process.env.WORKLOG_PROVIDER = provider;
  }
}

program
  .command('today')
  .description('生成今日工作日报')
  .option('-r, --repo <path>', '仓库路径', process.cwd())
  .option(
    '--provider <name>',
    'AI 提供方: openai（默认）| deepseek'
  )
  .action(async (opts: { repo: string; provider?: string }) => {
    applyProvider(opts.provider);
    const { since, until } = todayRange();
    await runReport(opts.repo, since, until, 'daily', 'today');
  });

program
  .command('day')
  .description('生成指定日期日报')
  .requiredOption('-d, --date <yyyy-mm-dd>', '日期')
  .option('-r, --repo <path>', '仓库路径', process.cwd())
  .option('--provider <name>', 'AI 提供方: openai（默认）| deepseek')
  .action(async (opts: { date: string; repo: string; provider?: string }) => {
    applyProvider(opts.provider);
    const { since, until } = dayRange(opts.date);
    await runReport(opts.repo, since, until, 'daily', 'day');
  });

program
  .command('week')
  .description('生成本周工作周报')
  .option('-r, --repo <path>', '仓库路径', process.cwd())
  .option('--provider <name>', 'AI 提供方: openai（默认）| deepseek')
  .action(async (opts: { repo: string; provider?: string }) => {
    applyProvider(opts.provider);
    const { since, until } = weekRange();
    await runReport(opts.repo, since, until, 'weekly', 'week');
  });

program
  .command('month')
  .description('生成本月工作月报')
  .option('-r, --repo <path>', '仓库路径', process.cwd())
  .option('--provider <name>', 'AI 提供方: openai（默认）| deepseek')
  .action(async (opts: { repo: string; provider?: string }) => {
    applyProvider(opts.provider);
    const { since, until } = monthRange();
    await runReport(opts.repo, since, until, 'monthly', 'month');
  });

function askLine(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

program
  .command('commit')
  .description('根据 diff 用 AI 生成 commit message，确认后提交（需已暂存）')
  .option('-r, --repo <path>', '仓库路径', process.cwd())
  .option(
    '--staged',
    '仅使用暂存区 diff（默认 auto：有暂存则用暂存，否则用工作区 diff 仅生成不提交）'
  )
  .option(
    '--work',
    '仅使用未暂存 diff（只生成 message，不执行 git commit）'
  )
  .option('--no-commit', '只生成并打印 message，不提交')
  .option('--provider <name>', 'AI 提供方: openai（默认）| deepseek')
  .action(
    async (opts: {
      repo: string;
      staged?: boolean;
      work?: boolean;
      commit?: boolean;
      provider?: string;
    }) => {
      applyProvider(opts.provider);
      const repo = opts.repo;
      const git = simpleGit(repo);
      const status = await git.status();
      const hasStaged = status.staged.length > 0;
      const hasUnstaged =
        status.not_added.length > 0 ||
        status.modified.length > 0 ||
        status.deleted.length > 0 ||
        status.renamed.length > 0;

      let mode: WorkingDiffMode = 'auto';
      if (opts.work) mode = 'unstaged';
      else if (opts.staged) mode = 'staged';

      // 无 --staged/--work 且仅有未暂存变更时，先询问是否需要 git add
      const shouldAskAddFirst =
        mode === 'auto' && hasUnstaged && !hasStaged;
      if (shouldAskAddFirst) {
        const addAnswer = await askLine(
          '检测到未暂存变更，是否需要先执行 git add .? [Y/N] '
        );
        if (addAnswer.toLowerCase() === 'y' || addAnswer.toLowerCase() === 'yes') {
          try {
            await git.add('.');
            process.stdout.write('已执行 git add。\n');
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            process.stderr.write('git add 失败: ' + msg + '\n');
            process.exitCode = 1;
            return;
          }
          const { diff: stagedDiff } = await getWorkingDiff(repo, 'staged');
          if (!stagedDiff.trim()) {
            process.stderr.write('暂存后无 diff，请检查。\n');
            process.exitCode = 1;
            return;
          }
          let stagedMessage: string;
          try {
            stagedMessage = await generateCommitMessage(stagedDiff);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            process.stderr.write('生成失败: ' + msg + '\n');
            process.exitCode = 1;
            return;
          }
          process.stdout.write('\n' + filterCommitMessageDisplay(stagedMessage) + '\n\n');
          const commitAnswer = await askLine(
            '是否使用上述 message 提交暂存区? [Y/N] '
          );
          if (
            commitAnswer.toLowerCase() !== 'y' &&
            commitAnswer.toLowerCase() !== 'yes'
          ) {
            process.stdout.write('已取消提交。\n');
            return;
          }
          try {
            await git.commit(stagedMessage);
            process.stdout.write('已提交。\n');
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            process.stderr.write('git commit 失败: ' + msg + '\n');
            process.exitCode = 1;
          }
          return;
        }
        // 用户选择不 add，继续用未暂存 diff 生成 message（仅展示，不提交）
      }

      const { diff, source } = await getWorkingDiff(repo, mode);
      if (!diff.trim()) {
        if (mode === 'staged' && hasUnstaged && !hasStaged) {
          process.stderr.write(
            '当前没有任何暂存的改动，但检测到未暂存变更。\n' +
              '请先使用 git add 将需要提交的改动暂存后，再运行 worklog commit --staged，\n' +
              '或去掉 --staged，仅基于工作区改动生成提交信息（不会自动提交）。\n'
          );
        } else {
          process.stderr.write('没有可分析的 diff（工作区与暂存区均无变更）。\n');
        }
        process.exitCode = 1;
        return;
      }

      const isUnstagedOnly =
        (mode === 'auto' && source === 'unstaged') || mode === 'unstaged';
      if (isUnstagedOnly) {
        let message: string;
        try {
          message = await generateCommitMessage(diff);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          process.stderr.write('生成失败: ' + msg + '\n');
          process.exitCode = 1;
          return;
        }
        process.stdout.write('\n' + filterCommitMessageDisplay(message) + '\n\n');
        process.stdout.write(
          '当前 diff 来自未暂存变更，未执行提交。请先 git add 后使用 worklog commit\n'
        );
        return;
      }

      let message: string;
      try {
        message = await generateCommitMessage(diff);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write('生成失败: ' + msg + '\n');
        process.exitCode = 1;
        return;
      }

      process.stdout.write('\n' + filterCommitMessageDisplay(message) + '\n\n');

      const noCommit = opts.commit === false || opts.work;
      if (noCommit || source !== 'staged') {
        if (source !== 'staged') {
          process.stdout.write(
            '当前 diff 来自未暂存变更，未执行提交。请先 git add 后使用 worklog commit\n'
          );
        } else {
          process.stdout.write('已使用 --no-commit，未执行提交。\n');
        }
        return;
      }

      const answer = await askLine('是否使用上述 message 提交暂存区? [Y/N] ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        process.stdout.write('已取消提交。\n');
        return;
      }

      try {
        await git.commit(message);
        process.stdout.write('已提交。\n');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write('git commit 失败: ' + msg + '\n');
        process.exitCode = 1;
      }
    }
  );

program.parse();
