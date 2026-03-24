import { createInterface } from 'readline';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Command } from 'commander';
import { defaultReportLanguageCode } from '../i18n/ui-locale.js';
import { getUiMessages, tmpl } from '../i18n/ui-messages.js';
import { runReport, type ReportTitleKind } from '../report/run-report.js';
import { stripReportTitlePrefix } from '../report/strip-title-for-field.js';
import { readLastReportOutput, saveLastReportOutput } from '../utils/last-output.js';
import { dayRange, todayRange } from '../utils/time-range.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { getCommits } from '../git/log.js';
import { getWorkingDiff } from '../git/working-diff.js';
import { summarize } from '../ai/summarize.js';
import { formatReportTitle, fallbackReport } from '../report/generate.js';
import { startLoading } from '../utils/loading.js';
import {
  dingtalkHeadless,
  dingtalkLoginWaitMs,
  dingtalkNavigationTimeoutMs,
  fillDingtalkCompletedWork,
  resolveDingtalkCompletedSelector,
  resolveDingtalkReportUrl,
} from '../platform/dingtalk/fill-dingtalk.js';

const execFileAsync = promisify(execFile);

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

async function fallbackCopyAndPrint(text: string): Promise<void> {
  const ui = getUiMessages();
  process.stdout.write('\n' + text + '\n');
  try {
    await copyToClipboard(text);
    process.stderr.write(ui.msgDingtalkFallbackCopied);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(tmpl(ui.msgDingtalkFallbackCopyFailed, { msg }));
  }
}

async function openDingtalkDesktop(appUrl?: string): Promise<void> {
  const targetUrl = appUrl?.trim() || process.env.WORKPILOT_DINGTALK_APP_URL?.trim();
  if (process.platform === 'darwin') {
    let opened = false;
    for (const appName of ['DingTalk', '钉钉']) {
      try {
        await execFileAsync('open', ['-a', appName]);
        opened = true;
        break;
      } catch {
        // try next app name
      }
    }
    if (!opened) {
      throw new Error('cannot open DingTalk app on macOS');
    }
    if (targetUrl) {
      await execFileAsync('open', [targetUrl]);
    }
    return;
  }

  if (process.platform === 'win32') {
    await execFileAsync('cmd', ['/c', 'start', '', 'dingtalk://']);
    return;
  }

  await execFileAsync('xdg-open', [targetUrl || 'dingtalk://']);
}

async function buildDailyTextForDingtalk(
  repo: string,
  since: string,
  until: string,
  titleKind: ReportTitleKind,
  language: string
): Promise<string> {
  const ui = getUiMessages();
  const commits = await getCommits(repo, since, until);
  if (commits.length > 0) {
    return runReport(repo, since, until, 'daily', titleKind, language);
  }

  // 兼容“尚未 commit，但已有暂存/工作区改动”的场景：直接基于 diff 生成可填充正文
  const { diff, source } = await getWorkingDiff(repo, 'auto');
  if (!diff.trim()) {
    return runReport(repo, since, until, 'daily', titleKind, language);
  }

  const stopLoading = startLoading(ui.loadingReportGenerating);
  let report = '';
  try {
    const commitList =
      source === 'staged'
        ? '(No committed changes in selected range; summarize from staged diff.)'
        : '(No committed changes in selected range; summarize from working-tree diff.)';
    report = await summarize('daily', commitList, diff, language);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes('OPEN_AI_API_KEY') ||
      msg.includes('DEEPSEEK_API_KEY') ||
      msg.includes('AI_PROVIDER')
    ) {
      report = fallbackReport([
        source === 'staged'
          ? 'staged changes (no commit yet)'
          : 'working-tree changes (no commit yet)',
      ]);
      process.stderr.write(ui.hintPrefix + msg + '\n');
    } else {
      stopLoading();
      throw e;
    }
  }
  stopLoading();

  const full = '\n' + formatReportTitle(titleKind) + '\n\n' + report + '\n';
  process.stdout.write(full);
  await saveLastReportOutput(full);
  return full;
}

export function registerDingtalkCommand(
  program: Command,
  cliName: string,
  applyProvider: (provider?: string) => void
): void {
  const ui = getUiMessages();
  program
    .command('dingtalk')
    .description(ui.cmdDingtalkDescription)
    .option('-r, --repo <path>', ui.optRepoPath, process.cwd())
    .option('--reuse', ui.optDingtalkReuse)
    .option('-d, --date <yyyy-mm-dd>', ui.optDate)
    .option('--web', ui.optDingtalkWeb)
    .option('--app-url <url>', ui.optDingtalkAppUrl)
    .option('--url <url>', ui.optDingtalkUrl)
    .option('--selector <css>', ui.optDingtalkSelector)
    .option('--login-wait-ms <ms>', ui.optDingtalkLoginWaitMs)
    .option('--nav-timeout-ms <ms>', ui.optDingtalkNavTimeoutMs)
    .option('--lang <code>', ui.optLangHelp)
    .option('--provider <name>', ui.optProvider)
    .action(
      async (opts: {
        repo: string;
        reuse?: boolean;
        date?: string;
        web?: boolean;
        appUrl?: string;
        url?: string;
        selector?: string;
        loginWaitMs?: string;
        navTimeoutMs?: string;
        lang?: string;
        provider?: string;
      }) => {
        applyProvider(opts.provider);
        let fullText: string;
        if (opts.reuse) {
          const cached = await readLastReportOutput();
          if (cached === null) {
            process.stderr.write(tmpl(ui.errDingtalkMissingCacheForReuse, { cliName }));
            process.exitCode = 1;
            return;
          }
          fullText = cached;
        } else {
          const { since, until } = opts.date ? dayRange(opts.date) : todayRange();
          const titleKind: ReportTitleKind = opts.date ? 'day' : 'today';
          fullText = await buildDailyTextForDingtalk(
            opts.repo,
            since,
            until,
            titleKind,
            opts.lang ?? defaultReportLanguageCode()
          );
        }

        const completed =
          stripReportTitlePrefix(fullText).trim() || fullText.trim();

        if (!opts.web) {
          let copied = false;
          try {
            await copyToClipboard(completed);
            copied = true;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            process.stderr.write(tmpl(ui.msgDingtalkFallbackCopyFailed, { msg }));
          }
          try {
            await openDingtalkDesktop(opts.appUrl);
            process.stdout.write(
              tmpl(ui.msgDingtalkAppLaunchOk, {
                copied: copied ? ui.msgDingtalkCopiedShort : ui.msgDingtalkNotCopiedShort,
              })
            );
            process.stdout.write(ui.msgDingtalkAppManualGuide);
            return;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            process.stderr.write(tmpl(ui.msgDingtalkAppOpenFailed, { msg }));
            await fallbackCopyAndPrint(completed);
            process.exitCode = 1;
            return;
          }
        }

        const url = resolveDingtalkReportUrl(opts.url);

        const result = await fillDingtalkCompletedWork({
          reportUrl: url,
          completedWorkText: completed,
          completedSelector: opts.selector ?? resolveDingtalkCompletedSelector(),
          loginWaitMs: dingtalkLoginWaitMs(opts.loginWaitMs),
          navigationTimeoutMs: dingtalkNavigationTimeoutMs(opts.navTimeoutMs),
          headless: dingtalkHeadless(),
          waitForEnterBeforeClose: async () => {
            process.stdout.write(ui.msgDingtalkBrowserCheck);
            await askLine(ui.msgDingtalkPressEnterWhenDone);
          },
        });

        if (!result.ok) {
          const detail = result.detail ? ` (${result.detail})` : '';
          process.stderr.write(
            tmpl(ui.msgDingtalkFillFailed, { reason: result.reason, detail })
          );
          await fallbackCopyAndPrint(completed);
          process.exitCode = 1;
          return;
        }

        process.stdout.write(ui.msgDingtalkFillOk);
      }
    );
}
