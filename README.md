# workpilot

用代码讲述你的工作。  
`workpilot` 是一个 AI CLI：自动读取 Git 提交与代码变化，快速生成可直接上报的日报 / 周报 / 月报，并支持基于 diff 生成 commit message。

[![npm version](https://img.shields.io/npm/v/workpilot.svg)](https://www.npmjs.com/package/workpilot)
[![npm downloads](https://img.shields.io/npm/dw/workpilot.svg)](https://www.npmjs.com/package/workpilot)
[![license](https://img.shields.io/npm/l/workpilot.svg)](https://github.com/gaozhixiaopengpeng/work-pilot/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/workpilot.svg)](https://www.npmjs.com/package/workpilot)

---

## 为什么用 workpilot

- 少写重复汇报：把零散 commit 自动整理成结构化日报
- 降低沟通成本：技术变更转成非技术同事也能读懂的总结
- 保持提交质量：基于 diff 生成更规范的 commit message
- 纯 CLI 工作流：无 UI、无平台绑定，适配本地与内网仓库

---

## 成本优势（低成本可持续）

> 约 **5 毛每百次**（按常见轻量模型与短文本场景估算，实际受模型、token 长度和网关计费影响）。

- 一次日报通常仅消耗少量 token
- 团队可按网关策略统一控费
- 建议先小范围试运行，再按月统计优化模型与提示词

---

## 30 秒上手

### 1) 安装

```bash
npm install -g workpilot
```

安装后可在终端使用 **`workpilot`** 或其短命令 **`wp`**（二者等价，下文示例以 `workpilot` 为例）。

### 2) 配置 API Key（同时支持 openai / deepseek）

```bash
# OpenAI（或 OpenAI 兼容网关 Key）
export OPEN_AI_API_KEY=sk-xxx
export OPEN_AI_MODEL=gpt-4o-mini

# DeepSeek
export DEEPSEEK_API_KEY=sk-xxx
export DEEPSEEK_MODEL=deepseek-chat

# 默认走哪个（可选）
# 也可以不设置 AI_PROVIDER：当仅配置一个 Key 时会自动推断
export AI_PROVIDER=openai
```

> 说明：`workpilot` 运行时会直接读取当前终端会话里的环境变量（`process.env`），不依赖你运行命令时所在的目录。
>
> 若你希望“新开终端也自动生效”，请把上面的 `export` 追加到你的 shell 配置文件里（不要放到项目目录里）：
>
> - bash：`~/.bash_profile` 或 `~/.bashrc`
> - zsh：`~/.zshrc`
>
> 修改后要么重新打开终端，要么执行 `source ~/.bash_profile` / `source ~/.bashrc` / `source ~/.zshrc`（按你实际改的文件）。

### 3) 生成今日日报

```bash
workpilot day
```

---

## 常用命令

```bash
# 今日日报
workpilot day

# 指定日期日报
workpilot day --date 2026-03-10

# 本周周报
workpilot week

# 本月月报
workpilot month

# 基于 diff 生成 commit message（可确认后提交）
git add -A
workpilot commit
```

---

## 示例输出

```text
今日工作总结

1. 完成用户登录接口开发并补齐异常处理
2. 修复支付流程中的边界错误，补充回归验证
3. 优化列表页渲染性能，首屏耗时下降
4. 新增订单状态流转逻辑并完成联调
```

---

## 适用场景

- 每天下班前快速产出日报
- 每周复盘输出周报，沉淀阶段性成果
- 外企或跨团队协作，生成中文为主并可附加英文版本
- 个人开发者持续记录 side project 进展

---

## 环境变量说明

| 变量 | 说明 |
|------|------|
| `AI_PROVIDER` | `openai` 或 `deepseek` |
| `OPEN_AI_API_KEY` | OpenAI 或 OpenAI 兼容网关 Key |
| `OPEN_AI_BASE` | OpenAI 兼容网关 Base URL（可选） |
| `OPEN_AI_MODEL` | OpenAI 兼容模型名（可选） |
| `DEEPSEEK_API_KEY` | DeepSeek Key |
| `DEEPSEEK_MODEL` | DeepSeek 模型名（可选） |

补充说明：
- `OPEN_AI_BASE` 是 OpenAI 兼容网关地址；当你选择 `deepseek` provider 时，代码也会优先复用 `OPEN_AI_BASE` 作为 `baseURL`。如果你只想使用官方 DeepSeek 地址，建议不要设置 `OPEN_AI_BASE`。

自动推断规则：
- 两个 Key 都未配置 -> 提示先配置 `OPEN_AI_API_KEY` 或 `DEEPSEEK_API_KEY`
- 仅配置 `OPEN_AI_API_KEY` -> 使用 `openai`
- 仅配置 `DEEPSEEK_API_KEY` -> 使用 `deepseek`
- 两个 Key 同时配置但未设置 `AI_PROVIDER` -> 提示配置 `AI_PROVIDER=openai` 或 `AI_PROVIDER=deepseek`

---

## 仓库与兼容性

- Node.js >= 18
- 支持本地 Git 仓库
- 支持 GitHub / GitLab（含企业内网 GitLab）

---

## 反馈与问题

- 提交 Issue：<https://github.com/gaozhixiaopengpeng/work-pilot/issues>
- 项目主页：<https://github.com/gaozhixiaopengpeng/work-pilot>

---

## License

MIT
