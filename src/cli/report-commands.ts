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
import {
  runDingtalkAssist,
  runFeishuAssist,
  runWecomAssist,
} from './dingtalk-command.js';
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
  dingding?: boolean;
  feishu?: boolean;
  wecom?: boolean;
  weixin?: boolean;
};

type ReportAssistKind = 'day' | 'week' | 'month';

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
    .option('--dingding', ui.optDingdingCompat)
    .option('--feishu', ui.optFeishuSupport)
    .option('--wecom', ui.optWecomSupport)
    .option('--weixin', ui.optWeixinCompat)
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
        if (opts.dingtalk || opts.dingding) {
          await runDingtalkAssist(fullText, 'day');
        }
        if (opts.feishu) {
          await runFeishuAssist(fullText, 'day');
        }
        if (opts.wecom || opts.weixin) {
          await runWecomAssist(fullText, 'day');
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
    assistKind: ReportAssistKind;
  }> = [
    {
      name: 'week',
      description: ui.cmdWeekDescription,
      range: weekRange,
      prompt: 'weekly',
      title: 'week',
      assistKind: 'week',
    },
    {
      name: 'month',
      description: ui.cmdMonthDescription,
      range: monthRange,
      prompt: 'monthly',
      title: 'month',
      assistKind: 'month',
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
        if (opts.dingtalk || opts.dingding) {
          await runDingtalkAssist(fullText, spec.assistKind);
        }
        if (opts.feishu) {
          await runFeishuAssist(fullText, spec.assistKind);
        }
        if (opts.wecom || opts.weixin) {
          await runWecomAssist(fullText, spec.assistKind);
        }
        return fullText;
      });
    });
  }
}
