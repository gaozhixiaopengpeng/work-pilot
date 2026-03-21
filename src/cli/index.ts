#!/usr/bin/env node
import path from 'node:path';
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
import { copyToClipboard } from '../utils/clipboard.js';
import {
  saveLastReportOutput,
  readLastReportOutput,
} from '../utils/last-output.js';

function dayRange(dateStr: string): { since: string; until: string } {
  const parts = dateStr.split('-').map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`无效日期: ${dateStr}，请使用 YYYY-MM-DD`);
  }
  const [year, month, day] = parts;
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`无效日期: ${dateStr}，请使用 YYYY-MM-DD`);
  }
  const since = start.toISOString();
  const until = new Date(start.getTime() + 86400000).toISOString();
  return { since, until };
}

function todayRange(): { since: string; until: string } {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const until = new Date(start.getTime() + 86400000).toISOString();
  return { since: start.toISOString(), until };
}

function weekRange(): { since: string; until: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // 周一为一周开始
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diff,
    0,
    0,
    0,
    0
  );
  const since = monday.toISOString();
  const until = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  ).toISOString();
  return { since, until };
}

function monthRange(): { since: string; until: string } {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const until = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return { since: since.toISOString(), until: until.toISOString() };
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

/** 返回与写入 stdout 一致的完整文本，并写入「上次报表」缓存供 copy 使用 */
async function runReport(
  repo: string,
  since: string,
  until: string,
  promptName: 'daily' | 'weekly' | 'monthly',
  titleKind: 'today' | 'day' | 'week' | 'month',
  language?: string
): Promise<string> {
  const commits = await getCommits(repo, since, until);
  if (commits.length === 0) {
    const title = formatReportTitle(titleKind, language);
    const rest = '（所选时间范围内无 commit）\n';
    const full = title + rest;
    process.stdout.write(title);
    process.stdout.write(rest);
    await saveLastReportOutput(full);
    return full;
  }
  const commitList = formatCommitList(commits);
  let report: string;
  const stopLoading = startLoading(
    '正在根据 commit 与 diff 调用 AI 生成工作报告，可能需要数秒'
  );
  try {
    const diffBlock = await getDiffsForCommits(repo, commits);
    report = await summarize(promptName, commitList, diffBlock, language);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes('OPEN_AI_API_KEY') ||
      msg.includes('DEEPSEEK_API_KEY') ||
      msg.includes('AI_PROVIDER')
    ) {
      report = fallbackReport(commits.map((c) => c.message));
      process.stderr.write('提示: ' + msg + '\n');
    } else {
      stopLoading();
      throw e;
    }
  }
  stopLoading();
  const header = '\n' + formatReportTitle(titleKind, language) + '\n\n';
  const body = report + '\n';
  const full = header + body;
  process.stdout.write(header);
  process.stdout.write(body);
  await saveLastReportOutput(full);
  return full;
}

function assertOptionalCopyWord(
  postAction: string | undefined,
  command: string
): boolean {
  if (postAction === undefined) return true;
  if (postAction === 'copy') return true;
  process.stderr.write(
    `未知参数 "${postAction}"；若需在生成后复制到剪贴板，请使用: ${cliName} ${command} copy\n`
  );
  process.exitCode = 1;
  return false;
}

async function maybeCopyToClipboard(
  postAction: string | undefined,
  text: string
): Promise<void> {
  if (postAction !== 'copy') return;
  try {
    await copyToClipboard(text);
    process.stderr.write('已复制到剪贴板。\n');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write('复制到剪贴板失败: ' + msg + '\n');
    process.exitCode = 1;
  }
}

/** 打印过滤后的 commit message、写入 copy 缓存，并按需复制到剪贴板 */
async function publishCommitMessageForCopy(
  raw: string,
  postAction: string | undefined
): Promise<void> {
  const shown = filterCommitMessageDisplay(raw);
  process.stdout.write('\n' + shown + '\n\n');
  await saveLastReportOutput(shown);
  await maybeCopyToClipboard(postAction, shown);
}

/** 全局安装时可为 workpilot 或 wp；本地 node 入口为 index，统一显示为 workpilot */
function cliCommandName(): string {
  const { name } = path.parse(process.argv[1] ?? '');
  if (!name || name === 'index' || name === 'node') return 'workpilot';
  return name;
}

const cliName = cliCommandName();

const program = new Command();
program
  .name(cliName)
  .description('根据 Git commit 与 diff 用 AI 生成工作日报/周报/月报')
  .version('0.1.0');

function applyProvider(provider?: string): void {
  if (provider) {
    process.env.AI_PROVIDER = provider;
  }
}

program
  .command('day')
  .description('生成今日或指定日期日报')
  .argument('[postAction]', '传入 copy 则在输出后同时写入系统剪贴板')
  .option('-d, --date <yyyy-mm-dd>', '日期（留空则为今天）')
  .option('-r, --repo <path>', '仓库路径', process.cwd())
  .option(
    '--lang <code>',
    '输出语言代码（默认 zh 中文，如：en 表示仅英文）'
  )
  .option('--provider <name>', 'AI 提供方: openai（默认）| deepseek')
  .action(
    async (
      postAction: string | undefined,
      opts: {
        date?: string;
        repo: string;
        provider?: string;
        lang?: string;
      }
    ) => {
      if (!assertOptionalCopyWord(postAction, 'day')) return;
      applyProvider(opts.provider);
      const { since, until } = opts.date
        ? dayRange(opts.date)
        : todayRange();
      const titleKind = opts.date ? 'day' : 'today';
      const text = await runReport(
        opts.repo,
        since,
        until,
        'daily',
        titleKind,
        opts.lang
      );
      await maybeCopyToClipboard(postAction, text);
    }
  );

program
  .command('week')
  .description('生成本周工作周报')
  .argument('[postAction]', '传入 copy 则在输出后同时写入系统剪贴板')
  .option('-r, --repo <path>', '仓库路径', process.cwd())
  .option(
    '--lang <code>',
    '输出语言代码（默认 zh 中文，如：en 表示仅英文）'
  )
  .option('--provider <name>', 'AI 提供方: openai（默认）| deepseek')
  .action(
    async (
      postAction: string | undefined,
      opts: { repo: string; provider?: string; lang?: string }
    ) => {
      if (!assertOptionalCopyWord(postAction, 'week')) return;
      applyProvider(opts.provider);
      const { since, until } = weekRange();
      const text = await runReport(
        opts.repo,
        since,
        until,
        'weekly',
        'week',
        opts.lang
      );
      await maybeCopyToClipboard(postAction, text);
    }
  );

program
  .command('month')
  .description('生成本月工作月报')
  .argument('[postAction]', '传入 copy 则在输出后同时写入系统剪贴板')
  .option('-r, --repo <path>', '仓库路径', process.cwd())
  .option(
    '--lang <code>',
    '输出语言代码（默认 zh 中文，如：en 表示仅英文）'
  )
  .option('--provider <name>', 'AI 提供方: openai（默认）| deepseek')
  .action(
    async (
      postAction: string | undefined,
      opts: { repo: string; provider?: string; lang?: string }
    ) => {
      if (!assertOptionalCopyWord(postAction, 'month')) return;
      applyProvider(opts.provider);
      const { since, until } = monthRange();
      const text = await runReport(
        opts.repo,
        since,
        until,
        'monthly',
        'month',
        opts.lang
      );
      await maybeCopyToClipboard(postAction, text);
    }
  );

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

async function readStdinUtf8(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function startLoading(message: string): () => void {
  let stopped = false;
  // 进度提示统一写到 stderr，避免污染 stdout 的正式输出
  process.stderr.write(message);
  const interval = setInterval(() => {
    if (stopped) return;
    process.stderr.write('.');
  }, 1000);
  return () => {
    if (stopped) return;
    stopped = true;
    clearInterval(interval);
    process.stderr.write('\n');
  };
}

program
  .command('commit')
  .description('根据 diff 用 AI 生成 commit message，确认后提交（需已暂存）')
  .argument('[postAction]', '传入 copy 则在展示 message 后同时写入系统剪贴板')
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
    async (
      postAction: string | undefined,
      opts: {
        repo: string;
        staged?: boolean;
        work?: boolean;
        commit?: boolean;
        provider?: string;
      }
    ) => {
      if (!assertOptionalCopyWord(postAction, 'commit')) return;
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
          '检测到未暂存变更，是否需要先执行 git add -A? [Y/N] '
        );
        if (addAnswer.toLowerCase() === 'y' || addAnswer.toLowerCase() === 'yes') {
          try {
            await git.add('.');
            process.stdout.write('已执行 git add -A\n');
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
          const stopLoading = startLoading(
            '正在根据暂存区 diff 调用 AI 生成 commit message，请等待'
          );
          try {
            stagedMessage = await generateCommitMessage(stagedDiff);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            process.stderr.write('\n生成失败: ' + msg + '\n');
            process.exitCode = 1;
            stopLoading();
            return;
          }
          stopLoading();
          await publishCommitMessageForCopy(stagedMessage, postAction);
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
              `请先使用 git add 将需要提交的改动暂存后，再运行 ${cliName} commit --staged，\n` +
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
        const stopLoading = startLoading(
          '正在根据未暂存 diff 调用 AI 生成 commit message，可能需要数秒'
        );
        try {
          message = await generateCommitMessage(diff);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          process.stderr.write('\n生成失败: ' + msg + '\n');
          process.exitCode = 1;
          stopLoading();
          return;
        }
        stopLoading();
        await publishCommitMessageForCopy(message, postAction);
        process.stdout.write(
          `当前 diff 来自未暂存变更，未执行提交。请先 git add 后使用 ${cliName} commit\n`
        );
        return;
      }

      let message: string;
      const stopLoading = startLoading(
        '正在根据 diff 调用 AI 生成 commit message，可能需要数秒'
      );
      try {
        message = await generateCommitMessage(diff);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write('\n生成失败: ' + msg + '\n');
        process.exitCode = 1;
        stopLoading();
        return;
      }
      stopLoading();

      await publishCommitMessageForCopy(message, postAction);

      const noCommit = opts.commit === false || opts.work;
      if (noCommit || source !== 'staged') {
        if (source !== 'staged') {
          process.stdout.write(
            `当前 diff 来自未暂存变更，未执行提交。请先 git add 后使用 ${cliName} commit\n`
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

program
  .command('copy')
  .description(
    '复制到系统剪贴板：可用管道、--text，或复制最近一次报表 / commit message 等缓存正文'
  )
  .option('-t, --text <string>', '直接复制该字符串（无需管道）')
  .action(async (opts: { text?: string }) => {
    let content: string;
    if (opts.text !== undefined) {
      content = opts.text;
    } else if (process.stdin.isTTY) {
      const last = await readLastReportOutput();
      if (last !== null) {
        content = last;
      } else {
        process.stderr.write(
          `没有可复制的缓存内容。请先在同一台机器上执行 ${cliName} day / week / month / commit 生成输出，或使用：\n` +
            `  ${cliName} day | ${cliName} copy\n` +
            `  ${cliName} copy --text "一段说明"\n`
        );
        process.exitCode = 1;
        return;
      }
    } else {
      content = await readStdinUtf8();
      if (content === '') {
        const last = await readLastReportOutput();
        if (last !== null) {
          content = last;
        } else {
          process.stderr.write(
            `标准输入为空，且没有已缓存内容。请使用：\n` +
              `  ${cliName} day | ${cliName} copy\n` +
              `  ${cliName} copy --text "一段说明"\n`
          );
          process.exitCode = 1;
          return;
        }
      }
    }
    try {
      await copyToClipboard(content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write('复制到剪贴板失败: ' + msg + '\n');
      process.exitCode = 1;
      return;
    }
    process.stderr.write('已复制到剪贴板。\n');
  });

program.parse();
