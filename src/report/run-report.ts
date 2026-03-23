import { getCommits } from '../git/log.js';
import { getDiffsForCommits } from '../git/diff.js';
import { formatCommitList } from '../utils/format.js';
import { summarize } from '../ai/summarize.js';
import { formatReportTitle, fallbackReport } from './generate.js';
import { getUiMessages } from '../i18n/ui-messages.js';
import { saveLastReportOutput } from '../utils/last-output.js';
import { startLoading } from '../utils/loading.js';

export type ReportPromptName = 'daily' | 'weekly' | 'monthly';
export type ReportTitleKind = 'today' | 'day' | 'week' | 'month';

/** 返回与写入 stdout 一致的完整文本，并写入「上次报表」缓存供 copy 使用 */
export async function runReport(
  repo: string,
  since: string,
  until: string,
  promptName: ReportPromptName,
  titleKind: ReportTitleKind,
  language?: string
): Promise<string> {
  const ui = getUiMessages();
  const commits = await getCommits(repo, since, until);
  if (commits.length === 0) {
    const title = formatReportTitle(titleKind);
    const rest =
      typeof ui.reportNoCommitsInRange === 'string' ? ui.reportNoCommitsInRange : '';
    const full = title + rest;
    process.stdout.write(title);
    if (rest) process.stdout.write(rest);
    await saveLastReportOutput(full);
    return full;
  }
  const commitList = formatCommitList(commits);
  let report = '';
  const stopLoading = startLoading(ui.loadingReportGenerating);
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
      process.stderr.write(ui.hintPrefix + msg + '\n');
    } else {
      stopLoading();
      throw e;
    }
  }
  stopLoading();
  const header = '\n' + formatReportTitle(titleKind) + '\n\n';
  const body = report + '\n';
  const full = header + body;
  process.stdout.write(header);
  process.stdout.write(body);
  await saveLastReportOutput(full);
  return full;
}
