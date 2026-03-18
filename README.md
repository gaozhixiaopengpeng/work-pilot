# Logpilot

AI 自动生成 Git 工作日报的命令行工具，让「写日报 / 周报 / 月报」变成一条命令的事。

Logpilot 会自动读取你的 Git commit 和代码 diff，然后通过 AI 帮你生成：

* 日报
* 周报
* 月报
* 工作总结
* 基于 diff 的高质量 commit message（可选自动提交）

支持：

* 本地 Git 仓库
* GitHub
* GitLab（包括企业内网 GitLab）

非常适合：

* 程序员写日报、周报、月报
* 外企 / 远程团队里需要中英文汇报的工程师
* 想要把「零散 commit」沉淀成「结构化工作记录」的个人开发者

---

## 特性一览

* 📦 **自动读取 Git commit**：按天 / 周 / 月汇总你的提交
* ✍️ **基于 diff 生成 commit message**：先看草稿，再决定要不要提交
* 🧠 **AI 自动生成日报 / 周报 / 月报**：面向非技术同事也能看懂
* 🌐 **多语言输出**：默认中文，可附加英文等其他语言
* 📅 **灵活时间范围**：支持今日、指定日期、本周、本月
* 🖥 **纯 CLI 工作流**：无需 UI，无需登录任何平台
* 🔒 **友好支持内网 GitLab**：只依赖你的 Git 和 AI 网关配置
* ⚡ **从 commit 到日报一条龙**：1 秒生成可直接复制的工作总结

更详细的子命令说明见本仓库的命令说明文档files/CLI-COMMANDS。

---

## 安装与环境要求

**前置要求：**

* Node.js **≥ 18**
* 目标目录为一个 Git 仓库（或通过 `--repo` 指定）

**全局安装：**

```bash
npm install -g logpilot
```

安装完成后即可在任意目录直接使用：

```bash
logpilot day
```

**本地开发（clone 本仓库）：**

```bash
npm install
npm run build
node dist/cli/index.js day
# 或 npm link 后直接使用 logpilot
```

---

## AI 配置（环境变量）

Logpilot 使用 **OpenAI 兼容 API**，默认提供方为 **OpenAI 兼容**，也可切换为 **DeepSeek**。请通过「环境变量」进行配置（适用于本机、CI、容器等环境）。

**环境变量：**

| 变量 | 说明 |
|------|------|
| `AI_PROVIDER` | `openai`（默认）或 `deepseek`；可不配置，见下面说明 |
| `OPEN_AI_API_KEY` | OpenAI 或任意 OpenAI 兼容网关的 API Key |
| `DEEPSEEK_API_KEY` | DeepSeek 专用 Key |
| `OPEN_AI_BASE` | 自定义 OpenAI 兼容网关 Base URL（可选，用于代理 / 企业网关） |
| `OPEN_AI_MODEL` | OpenAI 兼容模型名（可选，默认 `gpt-4o-mini`） |
| `DEEPSEEK_MODEL` | DeepSeek 模型名（可选，默认 `deepseek-chat`） |

**AI_PROVIDER 自动推断规则：**

- 仅配置 `OPEN_AI_API_KEY`：自动视为 `AI_PROVIDER=openai`
- 仅配置 `DEEPSEEK_API_KEY`：自动视为 `AI_PROVIDER=deepseek`
- 两个 Key 都配置或都未配置，且未显式设置 `AI_PROVIDER`：运行时会给出提示，请通过环境变量明确设置 `AI_PROVIDER=openai` 或 `AI_PROVIDER=deepseek`

**命令行临时切换提供方：**

```bash
logpilot day --provider deepseek
logpilot week --provider openai
```

---

## 快速开始（3 步）

1. 安装：

```bash
npm install -g logpilot
```

2. 设置环境变量（任选其一）

```bash
# 方式 A：仅本次命令生效（推荐临时使用）
OPEN_AI_API_KEY=sk-xxx AI_PROVIDER=openai logpilot day

# 方式 B：当前 shell 会话生效
export OPEN_AI_API_KEY=sk-xxx
export AI_PROVIDER=openai
logpilot day

# 方式 C：所有「新开的」终端 / shell 默认生效（推荐日常使用）
# bash（macOS 可能用 .bash_profile / .bashrc，按你实际生效的文件写入其一）
echo 'export OPEN_AI_API_KEY=sk-xxx' >> ~/.bash_profile
echo 'export AI_PROVIDER=openai' >> ~/.bash_profile
source ~/.bash_profile
#
# zsh（macOS 新版默认）
echo 'export OPEN_AI_API_KEY=sk-xxx' >> ~/.zshrc
echo 'export AI_PROVIDER=openai' >> ~/.zshrc
source ~/.zshrc

# DeepSeek 示例（自动推断为 deepseek）
DEEPSEEK_API_KEY=sk-xxx logpilot day
```

3. 每天下班前生成日报：

```bash
logpilot day
```

复制输出内容，直接粘贴到企业内部的日报系统即可。

---

## 常用命令速查

**生成今日工作日报（默认中文）：**

```bash
logpilot day
```

**生成指定日期的日报：**

```bash
logpilot day --date 2026-03-10
```

**生成本周周报：**

```bash
logpilot week
```

**生成本月月报：**

```bash
logpilot month
```

**根据 diff 生成 commit message（可交互确认后提交）：**

```bash
git add -A   # 先暂存变更
logpilot commit
# 使用暂存区 diff：logpilot commit --staged
# 只生成不提交：logpilot commit --no-commit
# 仅基于未暂存 diff 生成（不会执行提交）：logpilot commit --work
```

**指定仓库路径（在非仓库目录运行）：**

```bash
logpilot day --repo /path/to/project
```

**指定 GitHub 仓库（视当前实现支持情况而定）：**

```bash
logpilot day --repo https://github.com/user/project
```

更完整、更详细的命令参数说明，请查看files/CLI-COMMANDS.md

---

## 多语言输出（适合外企工程师）

Logpilot 支持 **多语言日报输出**，但**始终保证提供一份完整的中文版本（标题 + 内容）**，特别适合在外企工作的工程师：

* 默认输出：中文日报（标题 + 内容）
* 可选输出：通过 CLI 选项附加其他语言版本（如英文）

示例（附加英文版）：

```bash
logpilot day --lang en
```

在外企场景下，推荐的使用方式是：

* 对外（上报国内团队）：使用默认中文日报
* 对内（需要英文版本时）：在中文日报基础上附加英文版摘要或全文

---

## 示例输出（中文）

```text
今日工作总结

1. 实现用户登录接口
2. 修复支付流程中的异常问题
3. 优化列表页面渲染性能
4. 新增订单状态管理逻辑
```

---

## 工作原理

Logpilot 支持 **两条衔接的流程**：先辅助写出 commit，再基于已提交历史生成日报。

**1. 生成 commit message（提交前）**

```text
代码变更（工作区 / 暂存区）
      ↓
git diff（或 git diff --cached）
      ↓
AI 分析代码变化
      ↓
生成 commit message
      ↓
用户确认
      ↓
git commit
```

**2. 生成日报 / 周报 / 月报（提交后）**

```text
Git commit + diff（git log / git show）
      ↓
代码变更分析
      ↓
AI 总结
      ↓
生成日报 / 周报 / 月报
```

完整链路即：**变更 → diff → AI 写 message → 确认 → commit → 再用 commit + diff 生成日报**。
---

## 支持的仓库类型

| 类型        | 支持 |
| --------- | -- |
| 本地 Git    | ✅  |
| GitHub    | ✅  |
| GitLab    | ✅  |
| 内网 GitLab | ✅  |

---

## 常见使用场景

* **日常开发者**：每完成一块功能，使用 `logpilot commit` 生成规范的提交说明；下班前用 `logpilot day` 生成日报。
* **外企工程师**：用中文日报对内同步；通过 `--lang en` 附加英文版本对外或跨团队同步。
* **个人开源 / side project**：每周使用 `logpilot week`，快速回顾本周在项目上的投入与成果。

---

## 未来计划

* 自动发送日报（邮件 / IM）
* Slack / 钉钉 / 飞书 / 企微集成
* PR 自动总结
* 多仓库聚合日报（一次性汇总多个仓库的工作到一份个人日报 / 周报）
* 工作时间 / 投入统计
* 团队级日报 / 周报汇总

---

## License

MIT
