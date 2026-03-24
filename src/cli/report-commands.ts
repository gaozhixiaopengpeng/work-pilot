import type { Command } from 'commander';
import {
  ARG_POST_ACTION_COPY,
  descPostActionCopyReport,
  runWithCopyPostAction,
} from './copy-support.js';
import { defaultReportLanguageCode } from '../i18n/ui-locale.js';
import { getUiMessages } from '../i18n/ui-messages.js';
import {
  runReport,
  type ReportPromptName,
  type ReportTitleKind,
} from '../report/run-report.js';
import { runDingtalkAssist } from './dingtalk-command.js';
import {
  dayRange,
  monthRange,
  todayRange,
  weekRange,
  type IsoTimeRange,
} from '../utils/time-range.js';

type ReportOpts = {
  repo: string;
  provider?: string;
  lang?: string;
  dingtalk?: boolean;
  appUrl?: string;
};

function withReportArguments(cmd: Command, description: string): Command {
  return cmd.description(description).argument(
    ARG_POST_ACTION_COPY,
    descPostActionCopyReport()
  );
}

function withReportOptions(cmd: Command): Command {
  const ui = getUiMessages();
  return cmd
    .option('-r, --repo <path>', ui.optRepoPath, process.cwd())
    .option('--lang <code>', ui.optLangHelp)
    .option('--dingtalk', ui.optDingtalkAssist)
    .option('--app-url <url>', ui.optDingtalkAppUrl)
    .option('--provider <name>', ui.optProvider);
}

export function registerReportCommands(
  program: Command,
  cliName: string,
  applyProvider: (provider?: string) => void
): void {
  const ui = getUiMessages();
  withReportOptions(
    withReportArguments(
      program.command('day'),
      ui.cmdDayDescription
    ).option('-d, --date <yyyy-mm-dd>', ui.optDate)
  ).action(
    async (
      postAction: string | undefined,
      opts: ReportOpts & { date?: string }
    ) => {
      await runWithCopyPostAction(cliName, 'day', postAction, async () => {
        applyProvider(opts.provider);
        const { since, until } = opts.date ? dayRange(opts.date) : todayRange();
        const titleKind: ReportTitleKind = opts.date ? 'day' : 'today';
        const fullText = await runReport(
          opts.repo,
          since,
          until,
          'daily',
          titleKind,
          opts.lang ?? defaultReportLanguageCode()
        );
        if (opts.dingtalk) {
          await runDingtalkAssist(fullText, opts.appUrl);
        }
        return fullText;
      });
    }
  );

  const fixed: Array<{
    name: string;
    description: string;
    range: () => IsoTimeRange;
    prompt: ReportPromptName;
    title: ReportTitleKind;
  }> = [
    {
      name: 'week',
      description: ui.cmdWeekDescription,
      range: weekRange,
      prompt: 'weekly',
      title: 'week',
    },
    {
      name: 'month',
      description: ui.cmdMonthDescription,
      range: monthRange,
      prompt: 'monthly',
      title: 'month',
    },
  ];

  for (const spec of fixed) {
    withReportOptions(
      withReportArguments(program.command(spec.name), spec.description)
    ).action(async (postAction: string | undefined, opts: ReportOpts) => {
      await runWithCopyPostAction(cliName, spec.name, postAction, async () => {
        applyProvider(opts.provider);
        const { since, until } = spec.range();
        const fullText = await runReport(
          opts.repo,
          since,
          until,
          spec.prompt,
          spec.title,
          opts.lang ?? defaultReportLanguageCode()
        );
        if (opts.dingtalk) {
          await runDingtalkAssist(fullText, opts.appUrl);
        }
        return fullText;
      });
    });
  }
}
