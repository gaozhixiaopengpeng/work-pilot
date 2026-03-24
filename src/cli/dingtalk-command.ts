import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getUiMessages, tmpl } from '../i18n/ui-messages.js';
import { stripReportTitlePrefix } from '../report/strip-title-for-field.js';
import { copyToClipboard } from '../utils/clipboard.js';

const execFileAsync = promisify(execFile);

async function activateMacApp(appName: string): Promise<void> {
  await execFileAsync('osascript', ['-e', `tell application "${appName}" to activate`]);
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function clickMacAppLabel(appName: string, label: string): Promise<boolean> {
  const script = `
set _target to "${label}"
tell application "System Events"
  if UI elements enabled is false then
    return "NO_ACCESS"
  end if
  tell process "${appName}"
    set frontmost to true
    repeat 12 times
      try
        set _all to entire contents of window 1
        repeat with _el in _all
          try
            set _name to name of _el as text
          on error
            set _name to ""
          end try
          try
            set _desc to description of _el as text
          on error
            set _desc to ""
          end try
          if _name contains _target or _desc contains _target then
            try
              perform action "AXPress" of _el
            on error
              try
                click _el
              on error
              end try
            end try
            return "OK"
          end if
        end repeat
      end try
      delay 0.35
    end repeat
  end tell
end tell
return "NOT_FOUND"
`;
  try {
    const { stdout } = await execFileAsync('osascript', ['-e', script]);
    return stdout.trim() === 'OK';
  } catch {
    return false;
  }
}

async function tryMacUiAssist(appName: string): Promise<void> {
  // Best-effort automation: move from current tab to Workbench -> Daily.
  await sleep(800);
  await clickMacAppLabel(appName, '工作台');
  await sleep(600);
  await clickMacAppLabel(appName, '日报');
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

function buildDingtalkPageDeeplink(url: string): string {
  return `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(url)}`;
}

async function openDingtalkDesktop(appUrls: string[]): Promise<void> {
  const targets = appUrls.map((s) => s.trim()).filter(Boolean);
  const deeplinks = targets.map((target) =>
    target.startsWith('dingtalk://') ? target : buildDingtalkPageDeeplink(target)
  );
  if (process.platform === 'darwin') {
    let openedAppName: string | null = null;
    for (const appName of ['DingTalk', '钉钉']) {
      try {
        await execFileAsync('open', ['-a', appName]);
        openedAppName = appName;
        break;
      } catch {
        // try next app name
      }
    }
    if (!openedAppName) {
      throw new Error('cannot open DingTalk app on macOS');
    }
    try {
      await activateMacApp(openedAppName);
    } catch {
      // ignore activate failure; app has already been launched
    }
    for (const target of deeplinks) {
      // App-only: open DingTalk deeplink only, never fallback to raw web URL.
      await execFileAsync('open', [target]);
    }
    try {
      await tryMacUiAssist(openedAppName);
    } catch {
      // ignore UI assist failures and keep manual guide fallback
    }
    return;
  }

  if (process.platform === 'win32') {
    await execFileAsync('cmd', ['/c', 'start', '', 'dingtalk://']);
    for (const target of deeplinks) {
      await execFileAsync('cmd', ['/c', 'start', '', target]);
    }
    return;
  }

  await execFileAsync('xdg-open', ['dingtalk://']);
  for (const target of deeplinks) {
    await execFileAsync('xdg-open', [target]);
  }
}

export async function runDingtalkAssist(fullText: string, appUrl?: string): Promise<void> {
  const ui = getUiMessages();
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
    const envAppUrl = process.env.WORKPILOT_DINGTALK_APP_URL?.trim();
    const candidateTargets = [appUrl?.trim() || '', envAppUrl || ''];
    await openDingtalkDesktop(candidateTargets);
    process.stdout.write(
      tmpl(ui.msgDingtalkAppLaunchOk, {
        copied: copied ? ui.msgDingtalkCopiedShort : ui.msgDingtalkNotCopiedShort,
      })
    );
    process.stdout.write(ui.msgDingtalkAppManualGuide);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(tmpl(ui.msgDingtalkAppOpenFailed, { msg }));
    await fallbackCopyAndPrint(completed);
    process.exitCode = 1;
  }
}
