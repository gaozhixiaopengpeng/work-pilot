/**
 * 格式化最终输出（stdout 用）
 */
export function formatReportTitle(
  kind: 'today' | 'day' | 'week' | 'month'
): string {
  if (kind === 'month') return '本月工作总结:';
  if (kind === 'week') return '本周工作总结:';
  return '今日工作总结:';
}

/**
 * 无 AI 时的占位输出
 */
export function fallbackReport(commitMessages: string[]): string {
  if (commitMessages.length === 0) return '(所选时间范围内无 commit，无法生成总结)\n';
  const lines = commitMessages.map((m, i) => `${i + 1}. ${m}`);
  return '今日工作 (仅 commit 摘要，未调用 AI): \n\n' + lines.join('\n') + '\n';
}
