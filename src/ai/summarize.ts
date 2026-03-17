import axios from 'axios';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 支持的 AI 提供方，默认 openai（OpenAI 兼容 API） */
export type AiProvider = 'openai' | 'deepseek';

const PROVIDER_DEFAULT: AiProvider = 'openai';

function normalizeProvider(value: string | undefined): AiProvider {
  const v = (value || PROVIDER_DEFAULT).toLowerCase();
  if (v === 'deepseek') return 'deepseek';
  return 'openai';
}

function resolveEndpoint(provider: AiProvider): {
  baseURL: string;
  apiKey: string | undefined;
  model: string;
} {
  if (provider === 'deepseek') {
    const baseURL =
      process.env.LOGPILOT_API_BASE ||
      process.env.WORKLOG_API_BASE ||
      process.env.OPENAI_API_BASE_URL ||
      'https://api.deepseek.com/v1';
    const apiKey =
      process.env.DEEPSEEK_API_KEY ||
      process.env.LOGPILOT_API_KEY ||
      process.env.WORKLOG_API_KEY ||
      process.env.OPENAI_API_KEY;
    const model =
      process.env.LOGPILOT_MODEL || process.env.WORKLOG_MODEL || 'deepseek-chat';
    return { baseURL, apiKey, model };
  }
  const baseURL =
    process.env.LOGPILOT_API_BASE ||
    process.env.WORKLOG_API_BASE ||
    process.env.OPENAI_API_BASE_URL ||
    'https://api.openai.com/v1';
  const apiKey =
    process.env.LOGPILOT_API_KEY ||
    process.env.WORKLOG_API_KEY ||
    process.env.OPENAI_API_KEY;
  const model =
    process.env.LOGPILOT_MODEL || process.env.WORKLOG_MODEL || 'gpt-4o-mini';
  return { baseURL, apiKey, model };
}

function missingKeyMessage(provider: AiProvider): string {
  if (provider === 'deepseek') {
    return (
      '请设置环境变量 DEEPSEEK_API_KEY（或 LOGPILOT_API_KEY / WORKLOG_API_KEY / OPENAI_API_KEY）后重试'
    );
  }
  return '请设置环境变量 LOGPILOT_API_KEY / WORKLOG_API_KEY 或 OPENAI_API_KEY 后重试';
}

async function loadPrompt(
  name: 'daily' | 'weekly' | 'monthly',
  commitList: string,
  diffBlock: string,
  language?: string
): Promise<string> {
  const pkgRoot = join(__dirname, '..', '..');
  const path = join(pkgRoot, 'prompts', `${name}.md`);
  let text: string;
  try {
    text = await readFile(path, 'utf-8');
  } catch {
    text = await readFile(join(process.cwd(), 'prompts', `${name}.md`), 'utf-8');
  }
  let finalText = text
    .replace(/\{\{COMMIT_LIST\}\}/g, commitList)
    .replace(/\{\{DIFF_BLOCK\}\}/g, diffBlock || '(无 diff 摘要)');
  const lang = (language || 'zh').toLowerCase();
  if (lang !== 'zh') {
    const langTag = lang;
    const langNote =
      '\n【语言输出要求覆盖】\n' +
      '1. 忽略前文中关于“使用中文输出”或“生成中文总结”的要求。\n' +
      `2. 全部输出统一使用 ${langTag} 语言完成，不要输出任何中文版本或多语言版本。\n` +
      `3. 保持与前文相同的结构和要点，只是将内容完全改写为 ${langTag} 语言。\n`;
    finalText += langNote;
  }
  return finalText;
}

type ChatMessage = { role: 'user' | 'system' | 'assistant'; content: string };

async function loadCommitPrompt(diffBlock: string): Promise<string> {
  const pkgRoot = join(__dirname, '..', '..');
  const path = join(pkgRoot, 'prompts', 'commit.md');
  let text: string;
  try {
    text = await readFile(path, 'utf-8');
  } catch {
    text = await readFile(join(process.cwd(), 'prompts', 'commit.md'), 'utf-8');
  }
  return text.replace(/\{\{DIFF_BLOCK\}\}/g, diffBlock || '(无 diff)');
}

async function chatComplete(content: string, temperature = 0.4): Promise<string> {
  const provider = normalizeProvider(
    process.env.LOGPILOT_PROVIDER || process.env.WORKLOG_PROVIDER
  );
  const { baseURL, apiKey, model } = resolveEndpoint(provider);
  if (!apiKey) {
    throw new Error(missingKeyMessage(provider));
  }
  const messages: ChatMessage[] = [{ role: 'user', content }];
  const url = baseURL.replace(/\/$/, '') + '/chat/completions';
  const { data } = await axios.post(
    url,
    { model, messages, temperature },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  );
  const choice = data?.choices?.[0]?.message?.content;
  if (!choice || typeof choice !== 'string') {
    throw new Error('AI 返回为空，请检查 API 与模型');
  }
  return choice.trim();
}

/**
 * 根据 diff 生成 commit message（不读取 Git，仅使用传入的 diff 文本）
 */
export async function generateCommitMessage(diffBlock: string): Promise<string> {
  const content = await loadCommitPrompt(diffBlock);
  return chatComplete(content, 0.3);
}

/**
 * 调用 LLM 生成工作总结（不读取 Git）
 * 提供方由 LOGPILOT_PROVIDER（兼容 WORKLOG_PROVIDER）决定，默认 openai；可选 deepseek。
 */
export async function summarize(
  promptName: 'daily' | 'weekly' | 'monthly',
  commitList: string,
  diffBlock: string,
  language?: string
): Promise<string> {
  const content = await loadPrompt(promptName, commitList, diffBlock, language);
  return chatComplete(content, 0.4);
}
