import { getFallbackUiMessages, getUiMessages } from '../i18n/ui-messages.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function pickFirst(...values: unknown[]): string {
  for (const value of values) {
    if (isNonEmptyString(value)) return value;
  }
  return '';
}

/** 打印在 stdout 的报表标题行：随终端 UI 语言，与 `--lang`（模型正文）无关 */
export function formatReportTitle(kind: 'today' | 'day' | 'week' | 'month'): string {
  const ui = getUiMessages();
  const fallback = getFallbackUiMessages();
  const value =
    kind === 'month'
      ? ui.reportTitleMonth
      : kind === 'week'
        ? ui.reportTitleWeek
        : kind === 'day'
          ? ui.reportTitleDay
          : ui.reportTitleToday;

  // 防御：运行时可能出现缺失 i18n key（例如全局旧版本/打包漏文件）
  return pickFirst(
    value,
    ui.reportTitleToday,
    ui.reportTitleDay,
    ui.reportTitleWeek,
    ui.reportTitleMonth,
    ui.reportTitleDefault,
    fallback.reportTitleDefault,
    fallback.reportTitleToday
  );
}

/**
 * 无 AI 时的占位输出（文案随终端 UI 语言，与 `--lang` 无关）
 */
export function fallbackReport(commitMessages: string[]): string {
  const ui = getUiMessages();
  const fallback = getFallbackUiMessages();
  if (commitMessages.length === 0) {
    return pickFirst(
      ui.fallbackNoCommits,
      ui.fallbackNoCommitsDefault,
      fallback.fallbackNoCommitsDefault,
      fallback.fallbackNoCommits
    );
  }

  const header = pickFirst(
    ui.fallbackReportHeader,
    ui.fallbackReportHeaderDefault,
    fallback.fallbackReportHeaderDefault,
    fallback.fallbackReportHeader
  );

  const lines = commitMessages.map((m, i) => `${i + 1}. ${String(m)}`);
  return header + lines.join('\n') + '\n';
}
