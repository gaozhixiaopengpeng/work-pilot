## Worklog CLI 命令说明（新手版）

本文档面向 **第一次使用 Worklog** 的用户，帮助你快速上手常用命令。

Worklog 是一个命令行工具，用来基于 **Git commit 与代码 diff** 自动生成：

- **工作日报**
- **周报 / 月报**
- **基于 diff 的 commit message**（可交互确认后提交）

---

## 基本前置条件

- **已安装 Node.js（推荐 ≥ 18）**
- 当前目录或指定路径下存在 **Git 仓库**
- 已配置 `.env` 中的 AI 相关 Key（参见项目根目录 `README.md`）

全局安装后即可使用：

```bash
npm install -g worklog
```

或者在项目中本地开发：

```bash
npm install
npm run build
node dist/cli/index.js day
```

> 说明：以下示例统一使用 `worklog` 命令，若你是本地开发未全局安装，可将其替换为 `node dist/cli/index.js`。

---

## 命令总览

- **`worklog day`**：生成**今日**或**指定日期**的日报
- **`worklog week`**：生成**本周**工作周报
- **`worklog month`**：生成**本月**工作月报
- **`worklog commit`**：根据代码 diff 由 AI 生成 commit message，可选自动提交

所有报表类命令均支持：

- `-r, --repo <path>`：指定要分析的仓库路径（默认当前目录）
- `--lang <code>`：指定输出语言代码（默认 `zh` 中文）
- `--provider <name>`：指定 AI 提供方，`openai`（默认）或 `deepseek`

---

## 1. 今日日报：`worklog day`

**作用**：基于「今天」在 Git 仓库中的 commit 与 diff，生成一份中文工作日报，可选附加其他语言版本。

**基本用法：**

```bash
worklog day
```

**常用选项：**

- `-r, --repo <path>`：指定仓库路径  
  ```bash
  worklog day --repo /path/to/project
  ```

- `--lang <code>`：指定输出语言  
  - 默认：仅生成中文日报  
  - 示例：附加英文版（仍会保证中文版本存在）  
  ```bash
  worklog day --lang en
  ```

- `--provider <name>`：切换 AI 提供方  
  ```bash
  worklog day --provider deepseek
  ```

**典型场景：**

- 每天下班前，在项目根目录执行一次 `worklog day`，直接复制输出内容到日报系统。

---

## 2. 指定日期日报：`worklog day --date`

**作用**：补生成指定日期的日报，例如忘记写某天日报时使用。

**可选参数：**

- `-d, --date <yyyy-mm-dd>`：指定日期（按本地时间从当天 00:00 到次日 00:00 的 commit；留空则为今天）

**示例：**

```bash
worklog day --date 2026-03-10
```

**配合其他选项使用：**

```bash
worklog day --date 2026-03-10 --repo /path/to/project --lang en
```

---

## 3. 本周周报：`worklog week`

**作用**：基于本周（周一到当前时间）的所有 commit 与 diff，生成一份周报。

**示例：**

```bash
worklog week
```

指定仓库与输出语言：

```bash
worklog week --repo /path/to/project --lang en
```

**周的计算方式（基于本地时间）：**

- 以 **周一** 为一周的开始；  
- 从本周一本地时间 00:00 起，统计到当前这一天结束（本地时间次日 00:00）。

---

## 4. 本月月报：`worklog month`

**作用**：基于本月（1 号到当前时间）的所有 commit 与 diff，生成一份月度工作总结。

**示例：**

```bash
worklog month
```

指定仓库与输出语言：

```bash
worklog month --repo /path/to/project --lang en
```

**月的范围：**

- 从本月 1 号本地时间 00:00 开始；  
- 截止到当前这一天结束（本地时间次日 00:00）。

---

## 5. AI 生成 commit message：`worklog commit`

**作用**：基于当前仓库的代码 diff（工作区或暂存区），调用 AI 生成合适的 commit message，并支持交互确认后执行 `git commit`。

> 建议在进行较大修改或多人协作项目中使用，可以提高 commit message 的质量和一致性。

### 5.1 基本用法

**常见流程：**

```bash
git add -A
worklog commit
```

交互行为说明（默认模式）：

1. 工具会检测当前仓库的变更状态；
2. 若只有未暂存变更，会询问你是否先执行 `git add -A`；
3. 根据最终的暂存区 diff 调用 AI 生成 commit message；
4. 将生成的 message 展示给你确认；
5. 你可以选择是否使用该 message 进行提交。

### 5.2 重要选项

- `-r, --repo <path>`：指定仓库路径  
  ```bash
  worklog commit --repo /path/to/project
  ```

- `--staged`：**只使用暂存区 diff**  
  - 适合你已经手动精确暂存了需要提交的文件；  
  - 若暂存区为空而工作区有变更，会提示先 `git add`。  
  ```bash
  worklog commit --staged
  ```

- `--work`：**只使用未暂存 diff**（仅生成 message，不提交）  
  - 不会执行 `git commit`；  
  - 用于只想看下 AI 建议的提交说明时。  
  ```bash
  worklog commit --work
  ```

- `--no-commit`：只生成并打印 message，不执行提交  
  - 常用于你想手工调整 message 或用于其他用途。  
  ```bash
  worklog commit --no-commit
  ```

- `--provider <name>`：切换 AI 提供方  
  ```bash
  worklog commit --provider deepseek
  ```

### 5.3 典型使用场景

- **单次提交，自动生成说明并提交：**

  ```bash
  git add -A
  worklog commit
  ```

- **仅查看建议 message，不提交：**

  ```bash
  worklog commit --no-commit
  # 或仅基于未暂存变更：
  worklog commit --work
  ```

- **精确控制暂存内容后再生成：**

  ```bash
  git add src/index.ts
  git add package.json
  worklog commit --staged
  ```

---

## 6. 多仓库 / 远程仓库使用说明

### 6.1 指定本地仓库路径

如果你在一个「非仓库」目录中，也可以通过 `--repo` 指定其他路径：

```bash
worklog day --repo /path/to/your/git-repo
worklog week --repo ../another-project
```

### 6.2 GitHub / GitLab 仓库

在支持的场景中，你也可以直接传入仓库地址（具体能力以当前实现为准）：

```bash
worklog day --repo https://github.com/user/project
```

> 提示：对于企业内网 GitLab，请确保你的网络与认证方式已按项目 `README.md` 中的说明配置完毕。

---

## 7. 常见问题（FAQ）

- **Q1：为什么运行命令时提示没有 commit？**  
  **A：** Worklog 只会基于已有的 Git 提交记录生成报告。请确认：
  - 当前（或指定的）仓库已经初始化为 Git 仓库；
  - 在目标时间范围内（例如今天）确实有 commit；
  - 你传入的 `--date` 参数格式正确（`YYYY-MM-DD`）。

- **Q2：为什么 AI 相关命令失败或提示 Key 错误？**  
  **A：** 请检查当前工作目录下的 `.env` 是否已正确配置：
  - `WORKLOG_PROVIDER`（`openai` 或 `deepseek`）；
  - 对应的 `WORKLOG_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY`；
  - 如有自定义网关，请确认 `WORKLOG_API_BASE` 正确。

- **Q3：报表是用什么语言生成的？能否只要英文？**  
  **A：**
  - 默认始终输出 **中文日报 / 周报 / 月报**；
  - 通过 `--lang en` 可以附加英文输出，但中文版本仍会保留；
  - 具体多语言格式以当前实现为准。

- **Q4：`worklog commit` 会不会自动提交我不想提交的内容？**  
  **A：**
  - 若你使用 `--staged`，只会基于暂存区内容生成并提交；
  - 若未指定 `--staged/--work`，工具会提示你是否先 `git add -A`；
  - 在真正执行 `git commit` 前，会先展示生成的 message，并询问是否确认提交；
  - 使用 `--no-commit` 或 `--work` 时，**不会执行提交**。

---

## 8. 推荐使用习惯

- 每次完成一小块功能：
  1. `git add .`
  2. `worklog commit`（生成并确认提交说明）
- 每天结束前：
  - 在项目根目录执行 `worklog day`，复制输出到你的日报系统；
- 每周 / 每月总结：
  - 使用 `worklog week` / `worklog month`，快速整理阶段性成果。

掌握以上命令后，你已经可以在日常开发中高效地使用 Worklog 生成 commit message 和各类工作报告了。

