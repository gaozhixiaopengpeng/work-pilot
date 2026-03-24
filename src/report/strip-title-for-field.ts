/**
 * 从与 `runReport` 一致的 stdout 正文中取出适合填入「已完成工作」的正文
 *（去掉首行 UI 语言下的报表标题行）。
 */
export function stripReportTitlePrefix(full: string): string {
  const trimmed = full.replace(/^\s+/, '');
  const lines = trimmed.split('\n');
  let i = 0;
  if (lines[0] && /[:：]\s*$/.test(lines[0])) {
    i = 1;
    while (i < lines.length && lines[i].trim() === '') i += 1;
  }
  return lines.slice(i).join('\n').trimEnd();
}
