## workpilot CLI 命令说明（新手版）

本文档面向 **第一次使用 workpilot** 的用户，帮助你快速上手常用命令。

workpilot 是一个命令行工具，用来基于 **Git commit 与代码 diff** 自动生成：

- **工作日报**
- **周报 / 月报**
- **基于 diff 的 commit message**（可交互确认后提交）

---

## 基本前置条件

- **已安装 Node.js（推荐 ≥ 18）**
- 当前目录或指定路径下存在 **Git 仓库**
- 已通过环境变量配置 AI 相关 Key（参见项目根目录 `README.md`）

全局安装后即可使用：

```bash
npm install -g workpilot
```

或者在项目中本地开发：

```bash
npm install
npm run build
node dist/cli/index.js day
```

> 说明：以下示例统一使用 `workpilot` 命令，若你是本地开发未全局安装，可将其替换为 `node dist/cli/index.js`。

---

## 命令总览

- **`workpilot day`**：生成**今日**或**指定日期**的日报
- **`workpilot week`**：生成**本周**工作周报
- **`workpilot month`**：生成**本月**工作月报
- **`workpilot commit`**：根据代码 diff 由 AI 生成 commit message，可选自动提交

所有报表类命令均支持：

- `-r, --repo <path>`：指定要分析的仓库路径（默认当前目录）
- `--lang <code>`：指定输出语言代码（默认 `zh` 中文；若指定为 `en` 等非 `zh`，则**仅输出该语言**）
- `--provider <name>`：指定 AI 提供方，`openai`（默认）或 `deepseek`

---

## 1. 今日日报：`workpilot day`

**作用**：基于「今天」在 Git 仓库中的 commit 与 diff，生成一份工作日报。

**基本用法：**

```bash
workpilot day
```

**常用选项：**

- `-r, --repo <path>`：指定仓库路径  
  ```bash
  workpilot day --repo /path/to/project
  ```

- `--lang <code>`：指定输出语言  
  - 默认：输出中文（`zh`）  
  - 示例：输出英文（仅英文，不再输出中文）  
  ```bash
  workpilot day --lang en
  ```

- `--provider <name>`：切换 AI 提供方  
  ```bash
  workpilot day --provider deepseek
  ```

**典型场景：**

- 每天下班前，在项目根目录执行一次 `workpilot day`，直接复制输出内容到日报系统。

---

## 2. 指定日期日报：`workpilot day --date`

**作用**：补生成指定日期的日报，例如忘记写某天日报时使用。

**可选参数：**

- `-d, --date <yyyy-mm-dd>`：指定日期（按本地时间从当天 00:00 到次日 00:00 的 commit；留空则为今天）

**示例：**

```bash
workpilot day --date 2026-03-10
```

**配合其他选项使用：**

```bash
workpilot day --date 2026-03-10 --repo /path/to/project --lang en
```

---

## 3. 本周周报：`workpilot week`

**作用**：基于本周（周一到当前时间）的所有 commit 与 diff，生成一份周报。

**示例：**

```bash
workpilot week
```

指定仓库与输出语言：

```bash
workpilot week --repo /path/to/project --lang en
```

**周的计算方式（基于本地时间）：**

- 以 **周一** 为一周的开始；  
- 从本周一本地时间 00:00 起，统计到当前这一天结束（本地时间次日 00:00）。

---

## 4. 本月月报：`workpilot month`

**作用**：基于本月（1 号到当前时间）的所有 commit 与 diff，生成一份月度工作总结。

**示例：**

```bash
workpilot month
```

指定仓库与输出语言：

```bash
workpilot month --repo /path/to/project --lang en
```

**月的范围：**

- 从本月 1 号本地时间 00:00 开始；  
- 截止到当前这一天结束（本地时间次日 00:00）。

---

## 5. AI 生成 commit message：`workpilot commit`

**作用**：基于当前仓库的代码 diff（工作区或暂存区），调用 AI 生成合适的 commit message，并支持交互确认后执行 `git commit`。

> 建议在进行较大修改或多人协作项目中使用，可以提高 commit message 的质量和一致性。

### 5.1 基本用法

**常见流程：**

```bash
git add -A
workpilot commit
```

交互行为说明（默认模式）：

1. 工具会检测当前仓库的变更状态；
2. 若同时存在暂存区变更，会优先使用暂存区 diff 生成 message；
3. 若只有未暂存变更，会询问你是否先执行 `git add -A`；
4. 若你选择先暂存，则基于暂存区 diff 生成 message，并询问是否提交；
5. 若你选择不暂存，则基于未暂存 diff 生成 message（只展示，不提交）。

### 5.2 重要选项

- `-r, --repo <path>`：指定仓库路径  
  ```bash
  workpilot commit --repo /path/to/project
  ```

- `--staged`：**只使用暂存区 diff**  
  - 适合你已经手动精确暂存了需要提交的文件；  
  - 若暂存区为空但工作区有变更，会提示先暂存后再运行，或去掉 `--staged` 仅生成不提交。  
  ```bash
  workpilot commit --staged
  ```

- `--work`：**只使用未暂存 diff**（仅生成 message，不提交）  
  - 不会执行 `git commit`；  
  - 用于只想看下 AI 建议的提交说明时。  
  ```bash
  workpilot commit --work
  ```

- `--no-commit`：只生成并打印 message，不执行提交  
  - 常用于你想手工调整 message 或用于其他用途。  
  ```bash
  workpilot commit --no-commit
  ```

- `--provider <name>`：切换 AI 提供方  
  ```bash
  workpilot commit --provider deepseek
  ```

### 5.3 典型使用场景

- **单次提交，自动生成说明并提交：**

  ```bash
  git add -A
  workpilot commit
  ```

- **仅查看建议 message，不提交：**

  ```bash
  workpilot commit --no-commit
  # 或仅基于未暂存变更：
  workpilot commit --work
  ```

- **精确控制暂存内容后再生成：**

  ```bash
  git add src/index.ts
  git add package.json
  workpilot commit --staged
  ```

---

## 6. 多仓库使用说明

### 6.1 指定本地仓库路径

如果你在一个「非仓库」目录中，也可以通过 `--repo` 指定其他路径：

```bash
workpilot day --repo /path/to/your/git-repo
workpilot week --repo ../another-project
```

> 说明：当前 `--repo` 需要是**本地 Git 仓库路径**。若你想分析 GitHub/GitLab 仓库，请先将其 clone 到本地再执行命令。

---

## 7. 常见问题（FAQ）

- **Q1：为什么运行命令时提示没有 commit？**  
**A：** workpilot 只会基于已有的 Git 提交记录生成报告。请确认：
  - 当前（或指定的）仓库已经初始化为 Git 仓库；
  - 在目标时间范围内（例如今天）确实有 commit；
  - 你传入的 `--date` 参数格式正确（`YYYY-MM-DD`）。

- **Q2：为什么 AI 相关命令失败或提示 Key / 提供方错误？**  
  **A：** 请检查环境变量是否已正确配置：
  - `OPEN_AI_API_KEY` / `DEEPSEEK_API_KEY` 至少需要配置一个（两个都未配置会提示先配置 Key）；
  - 如果同时配置了两个 Key，请显式设置 `AI_PROVIDER=openai` 或 `AI_PROVIDER=deepseek`；
  - 如有自定义网关，请确认 `OPEN_AI_BASE` 正确。

- **Q3：报表是用什么语言生成的？能否只要英文？**  
  **A：**
  - 默认输出中文（`zh`）；
  - 通过 `--lang en` 会切换为**仅输出英文**（不再输出中文）；
  - 其他语言同理：`--lang ja` / `--lang fr` 等。

- **Q4：`workpilot commit` 会不会自动提交我不想提交的内容？**  
  **A：**
  - 若你使用 `--staged`，只会基于暂存区内容生成并提交；
  - 若未指定 `--staged/--work`，工具会提示你是否先 `git add -A`；
  - 在真正执行 `git commit` 前，会先展示生成的 message，并询问是否确认提交；
  - 使用 `--no-commit` 或 `--work` 时，**不会执行提交**。

---

## 8. 推荐使用习惯

- 每次完成一小块功能：
  1. `git add .`
  2. `workpilot commit`（生成并确认提交说明）
- 每天结束前：
  - 在项目根目录执行 `workpilot day`，复制输出到你的日报系统；
- 每周 / 每月总结：
  - 使用 `workpilot week` / `workpilot month`，快速整理阶段性成果。

掌握以上命令后，你已经可以在日常开发中高效地使用 workpilot 生成 commit message 和各类工作报告了。

