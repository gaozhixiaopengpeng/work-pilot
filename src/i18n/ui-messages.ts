import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveUiLocale } from './ui-locale.js';

export type UiMessages = typeof import('./ui-strings.en.json');

const dir = dirname(fileURLToPath(import.meta.url));

function loadUiMessagesFile(locale: 'en' | 'zh'): UiMessages {
  const path = join(dir, `ui-strings.${locale}.json`);
  return JSON.parse(readFileSync(path, 'utf8')) as UiMessages;
}

const en = loadUiMessagesFile('en');
const zh = loadUiMessagesFile('zh');

let cached: UiMessages | null = null;

export function getUiMessages(): UiMessages {
  if (!cached) {
    cached = resolveUiLocale() === 'zh' ? zh : en;
  }
  return cached;
}

/** 英文基线文案：用于运行时兜底，避免 key 缺失导致空输出 */
export function getFallbackUiMessages(): UiMessages {
  return en;
}

export function tmpl(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}
