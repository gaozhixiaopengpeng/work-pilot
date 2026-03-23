import { getUiMessages } from '../i18n/ui-messages.js';

/** 打印在 stdout 的报表标题行：随终端 UI 语言，与 `--lang`（模型正文）无关 */
export function formatReportTitle(kind: 'today' | 'day' | 'week' | 'month'): string {
  const ui = getUiMessages();
  const value =
    kind === 'month'
      ? ui.reportTitleMonth
      : kind === 'week'
        ? ui.reportTitleWeek
        : kind === 'day'
          ? ui.reportTitleDay
          : ui.reportTitleToday;

  // 防御：运行时可能出现缺失 i18n key（例如全局旧版本/打包丢文件）
  return typeof value === 'string' && value.length > 0
    ? value
    : 'Work Summary:';
}

/**
 * 无 AI 时的占位输出（文案随终端 UI 语言，与 `--lang` 无关）
 */
export function fallbackReport(commitMessages: string[]): string {
  const ui = getUiMessages();
  if (commitMessages.length === 0) {
    return typeof ui.fallbackNoCommits === 'string' &&
      ui.fallbackNoCommits.length > 0
      ? ui.fallbackNoCommits
      : '(no commits in range; cannot generate summary)\n';
  }

  const header =
    typeof ui.fallbackReportHeader === 'string' &&
    ui.fallbackReportHeader.length > 0
      ? ui.fallbackReportHeader
      : "Work summary (commit titles only, AI not called): \n\n";

  const lines = commitMessages.map((m, i) => `${i + 1}. ${String(m)}`);
  return header + lines.join('\n') + '\n';
}
