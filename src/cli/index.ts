#!/usr/bin/env node
import path from 'node:path';
import { createInterface } from 'readline';
import { createRequire } from 'node:module';
import { Command } from 'commander';
import { simpleGit } from 'simple-git';
import {
  getWorkingDiff,
  type WorkingDiffMode,
} from '../git/working-diff.js';
import {
  ARG_POST_ACTION_COPY,
  assertOptionalCopyWord,
  descPostActionCopyCommit,
  runWithCopyPostAction,
  registerCopyCommand,
} from './copy-support.js';
import { getUiMessages, tmpl } from '../i18n/ui-messages.js';
import { registerReportCommands } from './report-commands.js';
import { generateCommitMessageWithCopy } from './commit-generate.js';

/** 全局安装时可为 workpilot 或 wp；本地 node 入口为 index，统一显示为 workpilot */
function cliCommandName(): string {
  const { name } = path.parse(process.argv[1] ?? '');
  if (!name || name === 'index' || name === 'node') return 'workpilot';
  return name;
}

const cliName = cliCommandName();

const require = createRequire(import.meta.url);
const { version: pkgVersion } = require('../../package.json') as { version: string };

const ui = getUiMessages();
const program = new Command();
program
  .name(cliName)
  .description(ui.programDescription)
  .version(pkgVersion);

function applyProvider(provider?: string): void {
  if (provider) {
    process.env.AI_PROVIDER = provider;
  }
}

registerReportCommands(program, cliName, applyProvider);

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
  .description(ui.cmdCommitDescription)
  .argument(ARG_POST_ACTION_COPY, descPostActionCopyCommit())
  .option('-r, --repo <path>', ui.optRepoPath, process.cwd())
  .option('--staged', ui.optStaged)
  .option('--work', ui.optWork)
  .option('--no-commit', ui.optNoCommit)
  .option('--provider <name>', ui.optProvider)
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
      if (!assertOptionalCopyWord(cliName, postAction, 'commit')) return;
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

      const shouldAskAddFirst =
        mode === 'auto' && hasUnstaged && !hasStaged;
      if (shouldAskAddFirst) {
        const addAnswer = await askLine(ui.askGitAddFirst);
        if (addAnswer.toLowerCase() === 'y' || addAnswer.toLowerCase() === 'yes') {
          try {
            await git.add('.');
            process.stdout.write(ui.msgGitAddDone);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            process.stderr.write(ui.msgGitAddFailedPrefix + msg + '\n');
            process.exitCode = 1;
            return;
          }
          const { diff: stagedDiff } = await getWorkingDiff(repo, 'staged');
          if (!stagedDiff.trim()) {
            process.stderr.write(ui.msgNoDiffAfterStage);
            process.exitCode = 1;
            return;
          }
          const stagedResult = await generateCommitMessageWithCopy(
            stagedDiff,
            ui.loadingCommitFromStaged,
            postAction
          );
          if (!stagedResult.ok) return;
          const stagedMessage = stagedResult.message;
          const commitAnswer = await askLine(ui.askCommitWithStaged);
          if (
            commitAnswer.toLowerCase() !== 'y' &&
            commitAnswer.toLowerCase() !== 'yes'
          ) {
            process.stdout.write(ui.msgCommitCancelled);
            return;
          }
          try {
            await git.commit(stagedMessage);
            process.stdout.write(ui.msgCommitted);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            process.stderr.write(ui.msgGitCommitFailedPrefix + msg + '\n');
            process.exitCode = 1;
          }
          return;
        }
      }

      const { diff, source } = await getWorkingDiff(repo, mode);
      if (!diff.trim()) {
        if (mode === 'staged' && hasUnstaged && !hasStaged) {
          process.stderr.write(tmpl(ui.errNoStagedButUnstaged, { cliName }));
        } else {
          process.stderr.write(ui.errNoAnalyzableDiff);
        }
        process.exitCode = 1;
        return;
      }

      const isUnstagedOnly =
        (mode === 'auto' && source === 'unstaged') || mode === 'unstaged';
      if (isUnstagedOnly) {
        const unstagedResult = await generateCommitMessageWithCopy(
          diff,
          ui.loadingCommitFromUnstaged,
          postAction
        );
        if (!unstagedResult.ok) return;
        process.stdout.write(tmpl(ui.msgUnstagedDiffNoCommit, { cliName }));
        return;
      }

      const mainResult = await generateCommitMessageWithCopy(
        diff,
        ui.loadingCommitFromDiff,
        postAction
      );
      if (!mainResult.ok) return;
      const message = mainResult.message;

      const noCommit = opts.commit === false || opts.work;
      if (noCommit || source !== 'staged') {
        if (source !== 'staged') {
          process.stdout.write(tmpl(ui.msgUnstagedDiffNoCommit, { cliName }));
        } else {
          process.stdout.write(ui.msgNoCommitSkipped);
        }
        return;
      }

      const answer = await askLine(ui.askCommitWithStaged);
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        process.stdout.write(ui.msgCommitCancelled);
        return;
      }

      try {
        await git.commit(message);
        process.stdout.write(ui.msgCommitted);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write(ui.msgGitCommitFailedPrefix + msg + '\n');
        process.exitCode = 1;
      }
    }
  );

registerCopyCommand(program, cliName);

program.parse();
