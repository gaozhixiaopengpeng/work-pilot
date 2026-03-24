# workpilot

用代码讲述你的工作。

把 Git 提交变成**可直接分享**的工作汇报。`workpilot` 是一个 AI CLI，会读取你的 Git 历史与代码变化，并生成：

- **日 / 周 / 月**总结
- 基于 diff 的**规范 commit message**
- 面向**非技术读者**也能读懂的表述

适合**站会、状态同步与进度跟踪**——无需再多一个网页应用，也无平台绑定。

**语言说明：** 仓库主文档默认为英文；本页为中文说明。[English](README.md)

[![npm version](https://img.shields.io/npm/v/workpilot.svg)](https://www.npmjs.com/package/workpilot)
[![npm downloads](https://img.shields.io/npm/dw/workpilot.svg)](https://www.npmjs.com/package/workpilot)
[![license](https://img.shields.io/npm/l/workpilot.svg)](https://github.com/gaozhixiaopengpeng/work-pilot/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/workpilot.svg)](https://www.npmjs.com/package/workpilot)

---

## 场景演示

你结束了一天的开发。经理问：

> 「你今天主要做了什么？」

不必再去翻 commit 记录：

```bash
workpilot day
```

示例输出：

```text
今日工作总结

1. 完成用户登录接口开发并补齐异常处理
2. 修复支付流程中的边界错误，补充回归验证
3. 优化列表页渲染性能，首屏耗时下降
4. 新增订单状态流转逻辑并完成联调
```

---

## 为什么用 workpilot

- **少写重复汇报：** 把零散 commit 整理成结构化总结
- **沟通更清晰：** 技术变更解释给非技术同事也能读懂
- **提交更规范：** 基于 diff、符合常见约定的 commit message
- **纯 CLI：** 无 UI、无厂商绑定；支持本地与内网离线环境

### 与 Cursor、Claude、Trae 等工具的区别

- **面向汇报，不是聊天：** 把 Git 记录整理成可分享的日/周/月报，不是通用 IDE 内助手。
- **自带 API Key、按次计费：** 按调用付费；不必为「写工作汇报」单独绑定 IDE 订阅。
- **与编辑器解耦：** 终端、脚本、自动化都能用，不依赖某一编辑器或托管工作区。
- **轻量、快速、省事：** 专职 CLI，不必打开大型 IDE 或聊天客户端；一条命令即用即走，启动与反馈路径短，适合快速出日报/周报。
- **10S完成：** 典型日报场景下，单条命令可在约 10 秒内完成生成（取决于网络与模型响应）。

---

## 30 秒上手

### 1) 安装

```bash
npm install -g workpilot
```

### 命令名与别名：`workpilot` / `wp`

- **两个命令，同一程序**：`package.json` 的 `bin` 同时提供 **`workpilot`** 与 **`wp`**，行为一致。
- **推荐写法**：下文示例优先使用 **`wp`**（例如 `wp day`、`wp commit`）。
- **帮助信息**：`workpilot --help` / `wp --help` 中用法行会显示你实际输入的命令名。

### 2) 配置 API Key（OpenAI 与/或 DeepSeek）

```bash
# OpenAI（或 OpenAI 兼容网关）
export OPEN_AI_API_KEY=sk-xxx
export OPEN_AI_MODEL=gpt-4o-mini

# DeepSeek
export DEEPSEEK_API_KEY=sk-xxx
export DEEPSEEK_MODEL=deepseek-chat

# 可选：默认 provider；未设置且只配了一个 Key 时会自动推断
export AI_PROVIDER=openai
```

> CLI 读取的是**当前 shell** 里的 **`process.env`**，与当前工作目录无关。
>
> 若希望新开终端也生效，请把 `export` 写进 shell 配置文件（不要放在仓库目录里）：
>
> - bash：`~/.bash_profile` 或 `~/.bashrc`
> - zsh：`~/.zshrc`
>
> 保存后新开终端，或对相应文件执行 `source`。

### 3) 生成今日日报

```bash
wp day
```

完成。

---

## 常用命令

以下示例统一使用 **`wp`**。

### Commit message

```bash
git add -A
wp commit
```

### 报表

```bash
wp day
wp week
wp month
wp day --date 2026-03-10
wp day --dingtalk # 等同于 wp day --dingding
wp week --feishu
wp month --wecom # 等同于 wp month --weixin
```

说明：

- `day`、`week`、`month` 为报表子命令。
- `--dingtalk` 可用于 `day` / `week` / `month`，会在生成后仅拉起钉钉客户端（同时尝试复制正文到剪贴板）。
- `dingding` 是 `dingtalk` 的兼容别名。
- `feishu` 为飞书客户端拉起能力（支持 `wp day|week|month --feishu`，同时尝试复制正文到剪贴板）。
- `wecom` 为企业微信客户端拉起能力（支持 `wp day|week|month --wecom`，同时尝试复制正文到剪贴板）。
- `weixin` 是 `wecom` 的兼容别名。

### 剪贴板

在命令末尾追加 **`copy`**，可在打印后将同一份正文写入系统剪贴板（例如 `wp week copy`、`wp commit --no-commit copy`）。

```bash
wp day copy
wp commit copy
wp week copy
wp copy
wp day | wp copy
```

单独执行 **`wp copy`** 时读取本机缓存（`$XDG_CACHE_HOME/workpilot/last-report.txt`；未设置 `XDG_CACHE_HOME` 时一般为 `~/.cache/workpilot/last-report.txt`）。

---

## 适用场景

- 下班前几分钟写出日报
- 周复盘与里程碑总结
- 站会、向上同步与经理汇报
- 多语言团队（中文为主时可用 `--lang` 控制模型输出语言）
- 个人项目与持续进展记录

---

## 成本说明（低且可预期）

> 在常见**短提示 + 轻量模型**下，大致为**每百次运行几毛钱**；实际费用取决于模型、token 与网关计费。

- 单次日报通常只消耗少量 token
- 团队可通过网关策略统一控费
- 建议先小范围试点，再按月调整模型与提示词

---

## 环境变量说明

| 变量 | 说明 |
|------|------|
| `AI_PROVIDER` | `openai` 或 `deepseek` |
| `OPEN_AI_API_KEY` | OpenAI 或兼容网关 Key |
| `OPEN_AI_BASE` | 可选：兼容网关 Base URL |
| `OPEN_AI_MODEL` | 可选：模型名 |
| `DEEPSEEK_API_KEY` | DeepSeek Key |
| `DEEPSEEK_MODEL` | 可选：DeepSeek 模型名 |

补充说明：

- `OPEN_AI_BASE` 为 OpenAI 兼容网关地址；使用 DeepSeek provider 时，代码也可能将 `OPEN_AI_BASE` 用作 `baseURL`。若仅使用官方 DeepSeek 端点，建议不要设置 `OPEN_AI_BASE`。

自动推断规则：

- 未配置任何 Key → 提示设置 `OPEN_AI_API_KEY` 或 `DEEPSEEK_API_KEY`
- 仅 `OPEN_AI_API_KEY` → `openai`
- 仅 `DEEPSEEK_API_KEY` → `deepseek`
- 两个 Key 都有但未设置 `AI_PROVIDER` → 提示设置 `AI_PROVIDER=openai` 或 `deepseek`

---

## 终端界面语言 与 报表 `--lang`

- **终端界面**（帮助、报错、加载提示，以及模型输出前的**报表标题行**）：根据系统语言环境（`LANG` / `LC_*` / `Intl`）在**英文与简体中文**间选择；中文环境为中文，否则为英文。通常**不必**手动设置；由操作系统或 shell 注入；CLI 按常见 locale 约定读取。
- **`day` / `week` / `month` 的 `--lang`**：控制**模型生成的报表正文**语言。省略时与**终端界面语言一致**（英文界面→英文正文，中文界面→中文正文）。**不会**单独切换界面文案与标题行（标题行仍随 UI）。

示例：

```bash
wp day --lang zh
```

---

## 环境与兼容性

- Node.js >= 18
- 本地 Git 仓库
- GitHub / GitLab（含自建 GitLab）

---

## 反馈

欢迎提交 Issue 与建议。

- Issue：<https://github.com/gaozhixiaopengpeng/work-pilot/issues>
- 仓库：<https://github.com/gaozhixiaopengpeng/work-pilot>

---

## License

MIT
