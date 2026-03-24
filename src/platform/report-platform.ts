/**
 * 平台填充链路统一接口（2.0 文档约定），便于后续接入企业微信、飞书等适配器。
 */
export type FillSection = 'completed' | 'pending' | 'coordination';

export type PlatformFillResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'nav_failed'
        | 'selector_not_found'
        | 'fill_failed'
        | 'verify_failed'
        | 'timeout'
        | 'cancelled';
      detail?: string;
    };

export interface ReportPlatformAdapter {
  resolveReportUrl(): string | null;
  openAndWaitForEditor(): Promise<void>;
  fillSection(section: FillSection, text: string): Promise<PlatformFillResult>;
  verifyFilled(section: FillSection): Promise<boolean>;
}
