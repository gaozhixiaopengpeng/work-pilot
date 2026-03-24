import type { Page } from 'playwright';
import { chromium } from 'playwright';
import os from 'node:os';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { PlatformFillResult } from '../report-platform.js';

const DEFAULT_LOGIN_WAIT_MS = 45_000;
const DEFAULT_NAV_TIMEOUT_MS = 90_000;
const DEFAULT_DINGTALK_REPORT_URL = 'https://workspace.dingtalk.com/page/report';

export type DingtalkFillOptions = {
  reportUrl: string;
  completedWorkText: string;
  completedSelector?: string;
  loginWaitMs: number;
  navigationTimeoutMs: number;
  headless: boolean;
  waitForEnterBeforeClose: () => Promise<void>;
};

function pickLocatorSelectors(custom?: string): string[] {
  if (custom?.trim()) return [custom.trim()];
  return [
    'textarea[placeholder*="已完成"]',
    'textarea[placeholder*="完成"]',
    'textarea[placeholder*="今日"]',
    'div[contenteditable="true"][data-placeholder*="完成"]',
    'textarea',
  ];
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fillElement(page: Page, selector: string, text: string): Promise<boolean> {
  const loc = page.locator(selector).first();
  const count = await loc.count();
  if (count === 0) return false;
  await loc.waitFor({ state: 'visible', timeout: 15_000 });
  const tag = await loc.evaluate((el: Element) => el.tagName.toLowerCase());
  if (tag === 'textarea' || tag === 'input') {
    await loc.fill(text);
    return true;
  }
  await loc.click({ timeout: 10_000 });
  await loc.evaluate(
    (el, t: string) => {
      const node = el as HTMLElement;
      if (node.isContentEditable) {
        node.innerText = t;
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
    text
  );
  return true;
}

async function verifyNonEmpty(page: Page, selector: string): Promise<boolean> {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return false;
  const len = await loc.evaluate((el: Element) => {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return el.value?.length ?? 0;
    }
    return (el as HTMLElement).innerText?.length ?? 0;
  });
  return len > 0;
}

async function launchBrowser(headless: boolean) {
  const userDataDir = path.join(
    process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'),
    'workpilot',
    'dingtalk-browser-profile'
  );
  await mkdir(userDataDir, { recursive: true });
  try {
    return await chromium.launchPersistentContext(userDataDir, {
      headless,
      channel: process.platform === 'darwin' ? 'chrome' : undefined,
      locale: 'zh-CN',
      viewport: { width: 1280, height: 900 },
    });
  } catch {
    return chromium.launchPersistentContext(userDataDir, {
      headless,
      locale: 'zh-CN',
      viewport: { width: 1280, height: 900 },
    });
  }
}

/**
 * 打开钉钉日报页并填充「已完成工作」；失败时返回 ok:false，由调用方做 stdout/剪贴板降级。
 */
export async function fillDingtalkCompletedWork(
  options: DingtalkFillOptions
): Promise<PlatformFillResult> {
  let browser;
  try {
    browser = await launchBrowser(options.headless);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: 'nav_failed',
      detail: msg,
    };
  }

  const page =
    browser.pages()[0] ??
    (await browser.newPage());
  try {
    await page.goto(options.reportUrl, {
      waitUntil: 'domcontentloaded',
      timeout: options.navigationTimeoutMs,
    });
  } catch (e) {
    await browser.close();
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: 'nav_failed', detail: msg };
  }

  await sleep(1500);

  const selectors = pickLocatorSelectors(options.completedSelector);
  const deadline = Date.now() + options.loginWaitMs;
  let lastError: string | undefined;
  let workingSelector: string | null = null;

  while (Date.now() < deadline) {
    for (const sel of selectors) {
      try {
        const n = await page.locator(sel).count();
        if (n > 0) {
          const vis = page.locator(sel).first();
          await vis.waitFor({ state: 'visible', timeout: 5000 });
          workingSelector = sel;
          break;
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    if (workingSelector) break;
    await sleep(800);
  }

  if (!workingSelector) {
    await browser.close();
    return {
      ok: false,
      reason: 'selector_not_found',
      detail: lastError,
    };
  }

  try {
    const filled = await fillElement(page, workingSelector, options.completedWorkText);
    if (!filled) {
      await browser.close();
      return { ok: false, reason: 'fill_failed' };
    }
  } catch (e) {
    await browser.close();
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: 'fill_failed', detail: msg };
  }

  const okVerify = await verifyNonEmpty(page, workingSelector);
  if (!okVerify) {
    await browser.close();
    return { ok: false, reason: 'verify_failed' };
  }

  try {
    await options.waitForEnterBeforeClose();
  } finally {
    await browser.close();
  }

  return { ok: true };
}

export function resolveDingtalkReportUrl(cliUrl?: string): string {
  const fromEnv = process.env.WORKPILOT_DINGTALK_REPORT_URL?.trim();
  const fromArg = cliUrl?.trim();
  return fromArg || fromEnv || DEFAULT_DINGTALK_REPORT_URL;
}

export function resolveDingtalkCompletedSelector(): string | undefined {
  const s = process.env.WORKPILOT_DINGTALK_COMPLETED_SELECTOR?.trim();
  return s || undefined;
}

export function dingtalkLoginWaitMs(cliMs?: string): number {
  if (cliMs !== undefined) {
    const n = Number(cliMs);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const env = process.env.WORKPILOT_DINGTALK_LOGIN_WAIT_MS?.trim();
  if (env) {
    const n = Number(env);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_LOGIN_WAIT_MS;
}

export function dingtalkNavigationTimeoutMs(cliMs?: string): number {
  if (cliMs !== undefined) {
    const n = Number(cliMs);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const env = process.env.WORKPILOT_DINGTALK_NAV_TIMEOUT_MS?.trim();
  if (env) {
    const n = Number(env);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_NAV_TIMEOUT_MS;
}

export function dingtalkHeadless(): boolean {
  const v = process.env.WORKPILOT_DINGTALK_HEADLESS?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
