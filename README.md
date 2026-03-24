# workpilot

Tell the story of your work through code.

Turn Git commits into **ready-to-share** work reports. `workpilot` is an AI CLI that reads your Git history and code changes to produce:

- **Daily / weekly / monthly** summaries
- **Clean commit messages** from diffs
- **Developer-friendly wording** for non-technical readers

Perfect for **daily standups, status updates, and progress tracking**—without another web app or vendor lock-in.

**Languages:** This file is English by default. [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/workpilot.svg)](https://www.npmjs.com/package/workpilot)
[![npm downloads](https://img.shields.io/npm/dw/workpilot.svg)](https://www.npmjs.com/package/workpilot)
[![license](https://img.shields.io/npm/l/workpilot.svg)](https://github.com/gaozhixiaopengpeng/work-pilot/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/workpilot.svg)](https://www.npmjs.com/package/workpilot)

---

## Demo

You finish coding for the day. Your manager asks:

> “What did you work on today?”

Instead of digging through commits:

```bash
workpilot day
```

Example output:

```text
Today's Work Summary:

1. Shipped user login API and tightened error handling
2. Fixed edge cases in checkout flow and added regression checks
3. Improved list rendering; faster first paint
4. Added order state machine and integration tests
```

---

## Why workpilot

- **Less repetitive reporting:** turn scattered commits into structured summaries
- **Clearer communication:** technical changes explained for non-technical readers
- **Better commits:** diff-based, convention-friendly messages
- **Pure CLI:** no UI or vendor lock-in; works with local and air-gapped repos

### Compared to Cursor, Claude, Trae, and similar tools

- **Report-first, not chat-first:** turns Git history into standup-ready summaries; it is not a general in-editor assistant.
- **Bring your own API key:** pay per run at API rates—no need to bundle an IDE subscription just for this workflow.
- **Runs wherever Git runs:** terminal, scripts, or automation without tying output to a specific editor or hosted workspace.
- **Lightweight and fast:** a focused CLI—no heavy IDE or chat app to launch; short path from command to output, ideal for quick standup-style reports.
- **Finish in 10 seconds:** in typical daily-report scenarios, one command can complete in about 10s (depending on network and model response).

---

## Quick start (about 30 seconds)

### 1) Install

```bash
npm install -g workpilot
```

### Command names: `workpilot` / `wp`

- **Same binary, two names**: `package.json` `bin` exposes **`workpilot`** and **`wp`**; behavior is identical.
- **Recommended style**: examples below prefer **`wp`** (e.g. `wp day`, `wp commit`).
- **Help**: `workpilot --help` / `wp --help` shows the name you invoked in the usage line.

### 2) API keys (OpenAI and/or DeepSeek)

```bash
# OpenAI (or OpenAI-compatible gateway)
export OPEN_AI_API_KEY=sk-xxx
export OPEN_AI_MODEL=gpt-4o-mini

# DeepSeek
export DEEPSEEK_API_KEY=sk-xxx
export DEEPSEEK_MODEL=deepseek-chat

# Optional default provider
# If unset, a single configured key is auto-detected
export AI_PROVIDER=openai
```

> The CLI reads **`process.env` from your current shell**, not from the project directory.
>
> To persist across new terminals, add the `export` lines to your shell config (not inside a repo):
>
> - bash: `~/.bash_profile` or `~/.bashrc`
> - zsh: `~/.zshrc`
>
> Then open a new terminal or `source` the file you edited.

### 3) Today’s daily report

```bash
wp day
```

Done.

---

## Common commands

Examples below use **`wp`**.

### Commit messages

```bash
git add -A
wp commit
```

### Reports

```bash
wp day
wp week
wp month
wp day --date 2026-03-10
wp day --dingtalk # equivalent to wp day --dingding
wp week --feishu
wp month --wecom # equivalent to wp month --weixin
```

Notes:

- `day`, `week`, and `month` are report subcommands.
- `--dingtalk` works with `day` / `week` / `month` and only opens DingTalk desktop app after generation (also tries to copy the report body to clipboard).
- `dingding` is an alias of `dingtalk`.
- `feishu` opens Feishu desktop app (use `wp day|week|month --feishu`; also tries to copy the report body to clipboard).
- `wecom` opens WeCom desktop app (use `wp day|week|month --wecom`; also tries to copy the report body to clipboard).
- `weixin` is an alias of `wecom`.

### Clipboard helpers

Append **`copy`** to write the same body to the system clipboard after printing (e.g. `wp week copy`, `wp commit --no-commit copy`).

```bash
wp day copy
wp commit copy
wp week copy
wp copy
wp day | wp copy
```

**`wp copy`** alone reads the local cache (`$XDG_CACHE_HOME/workpilot/last-report.txt`, or `~/.cache/workpilot/last-report.txt` when unset).

---

## When it helps

- End-of-day status in minutes
- Weekly reviews and milestones
- Team standups and manager updates
- Mixed-language teams (Chinese-first reports with optional `--lang` for model output)
- Side projects and steady progress logs

---

## Cost profile (low and predictable)

> For typical small prompts and light models, often on the order of **a few mao per hundred runs** (tenths of a yuan; usually well under ¥1 per hundred runs); actual cost depends on model, tokens, and your gateway.

- Each daily report usually uses a small number of tokens
- Teams can centralize spend via gateway policy
- Start with a small pilot, then tune model and prompts monthly

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | `openai` or `deepseek` |
| `OPEN_AI_API_KEY` | OpenAI or compatible gateway key |
| `OPEN_AI_BASE` | Optional compatible base URL |
| `OPEN_AI_MODEL` | Optional model name |
| `DEEPSEEK_API_KEY` | DeepSeek key |
| `DEEPSEEK_MODEL` | Optional DeepSeek model |

Notes:

- `OPEN_AI_BASE` is the OpenAI-compatible base URL; when using the DeepSeek provider, the code may reuse `OPEN_AI_BASE` as `baseURL`. For the official DeepSeek endpoint only, avoid setting `OPEN_AI_BASE`.

Inference:

- No keys → ask to set `OPEN_AI_API_KEY` or `DEEPSEEK_API_KEY`
- Only `OPEN_AI_API_KEY` → `openai`
- Only `DEEPSEEK_API_KEY` → `deepseek`
- Both keys without `AI_PROVIDER` → ask to set `AI_PROVIDER=openai` or `deepseek`

---

## CLI language (UI) vs report language (`--lang`)

- **Terminal UI** (help text, errors, hints, loading lines, and the **printed report title line** before the model output): **English or Chinese** from your OS locale (`LANG` / `LC_*` / `Intl`). Chinese locales → Chinese UI; otherwise English. You usually **do not** need to set these variables manually—the OS or shell sets them; the CLI reads them for POSIX-compatible locale detection.
- **`day` / `week` / `month --lang`**: controls **model-generated report body** language. If omitted, the body language **matches the terminal UI locale** (English UI → English body, Chinese UI → Chinese body). It does **not** switch the CLI chrome or the printed title line (those follow the UI locale above).

Example:

```bash
wp day --lang zh
```

---

## Requirements

- Node.js >= 18
- Local Git repository
- GitHub / GitLab (including self-hosted GitLab)

---

## Feedback

Issues and suggestions are welcome.

- Issues: <https://github.com/gaozhixiaopengpeng/work-pilot/issues>
- Repo: <https://github.com/gaozhixiaopengpeng/work-pilot>

---

## License

MIT
