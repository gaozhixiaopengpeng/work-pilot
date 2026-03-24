import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getUiMessages, tmpl } from '../i18n/ui-messages.js';
import { stripReportTitlePrefix } from '../report/strip-title-for-field.js';
import { copyToClipboard } from '../utils/clipboard.js';

const execFileAsync = promisify(execFile);
type ReportAssistKind = 'day' | 'week' | 'month';

function reportLabelByKind(ui: ReturnType<typeof getUiMessages>, kind: ReportAssistKind): string {
  if (kind === 'week') return ui.msgReportTypeWeek;
  if (kind === 'month') return ui.msgReportTypeMonth;
  return ui.msgReportTypeDay;
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

async function openAppUri(uri: string): Promise<void> {
  if (process.platform === 'darwin') {
    await execFileAsync('open', [uri]);
    return;
  }
  if (process.platform === 'win32') {
    await execFileAsync('cmd', ['/c', 'start', '', uri]);
    return;
  }
  await execFileAsync('xdg-open', [uri]);
}

async function launchDesktopAppByName(appNames: string[]): Promise<void> {
  if (process.platform !== 'darwin') return;
  for (const appName of appNames) {
    try {
      await execFileAsync('open', ['-a', appName]);
      return;
    } catch {
      // try next app name
    }
  }
}

async function openDingtalkDesktop(): Promise<void> {
  if (process.platform === 'darwin') {
    await launchDesktopAppByName(['DingTalk', '钉钉']);
    await openAppUri('dingtalk://');
    return;
  }

  if (process.platform === 'win32') {
    await execFileAsync('cmd', ['/c', 'start', '', 'dingtalk://']);
    return;
  }

  await execFileAsync('xdg-open', ['dingtalk://']);
}

export async function runDingtalkAssist(
  fullText: string,
  kind: ReportAssistKind
): Promise<void> {
  const ui = getUiMessages();
  const reportType = reportLabelByKind(ui, kind);
  const completed = stripReportTitlePrefix(fullText).trim() || fullText.trim();
  let copied = false;
  try {
    await copyToClipboard(completed);
    copied = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(tmpl(ui.msgDingtalkFallbackCopyFailed, { msg }));
  }
  try {
    await openDingtalkDesktop();
    process.stdout.write(
      tmpl(ui.msgDingtalkAppManualGuide, {
        copiedHint: copied ? ui.msgDingtalkCopiedHint : ui.msgDingtalkNotCopiedHint,
        reportType,
      })
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(tmpl(ui.msgDingtalkAppOpenFailed, { msg }));
    await fallbackCopyAndPrint(completed);
    process.exitCode = 1;
  }
}

async function runDesktopUriAssist(
  fullText: string,
  kind: ReportAssistKind,
  uriCandidates: string[],
  appNames: string[],
  openFailedMsg: string,
  manualGuideMsg: string,
  copiedHint: string,
  notCopiedHint: string
): Promise<void> {
  const ui = getUiMessages();
  const reportType = reportLabelByKind(ui, kind);
  const completed = stripReportTitlePrefix(fullText).trim() || fullText.trim();
  let copied = false;
  try {
    await copyToClipboard(completed);
    copied = true;
  } catch {
    // Keep going: user can still copy manually from output.
  }

  try {
    await launchDesktopAppByName(appNames);
    let opened = false;
    for (const uri of uriCandidates) {
      try {
        await openAppUri(uri);
        opened = true;
        break;
      } catch {
        // try next uri
      }
    }
    if (!opened) {
      throw new Error('no supported app uri');
    }
    process.stdout.write(
      tmpl(manualGuideMsg, {
        copiedHint: copied ? copiedHint : notCopiedHint,
        reportType,
      })
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(tmpl(openFailedMsg, { msg }));
    await fallbackCopyAndPrint(completed);
    process.exitCode = 1;
  }
}

export async function runFeishuAssist(
  fullText: string,
  kind: ReportAssistKind
): Promise<void> {
  const ui = getUiMessages();
  await runDesktopUriAssist(
    fullText,
    kind,
    ['feishu://', 'lark://'],
    ['Feishu', '飞书', 'Lark'],
    ui.msgFeishuAppOpenFailed,
    ui.msgFeishuAppManualGuide,
    ui.msgDingtalkCopiedHint,
    ui.msgDingtalkNotCopiedHint
  );
}

export async function runWecomAssist(
  fullText: string,
  kind: ReportAssistKind
): Promise<void> {
  const ui = getUiMessages();
  await runDesktopUriAssist(
    fullText,
    kind,
    ['wxwork://', 'wecom://'],
    ['企业微信', 'WeCom', 'Tencent WeCom'],
    ui.msgWecomAppOpenFailed,
    ui.msgWecomAppManualGuide,
    ui.msgDingtalkCopiedHint,
    ui.msgDingtalkNotCopiedHint
  );
}
