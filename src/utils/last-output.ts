import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** 最近一次报表或 commit message 等可复制正文路径（供单独执行 copy 使用） */
export function lastReportCacheFile(): string {
  const base =
    process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache');
  return path.join(base, 'workpilot', 'last-report.txt');
}

export async function saveLastReportOutput(text: string): Promise<void> {
  const file = lastReportCacheFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text, 'utf8');
}

/** 若无缓存或读失败则返回 null */
export async function readLastReportOutput(): Promise<string | null> {
  try {
    const file = lastReportCacheFile();
    const buf = await fs.readFile(file, 'utf8');
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}
