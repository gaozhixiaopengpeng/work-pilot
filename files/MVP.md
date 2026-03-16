# Worklog MVP 设计

目标：
在 **2 周内完成可用版本**。

核心功能：

1. 获取 Git commit
2. 获取 commit diff
3. **（提交前）** 基于 diff 由 AI 生成 commit message，用户确认后执行 `git commit`
4. AI 生成日报 / 周报 / 月报（基于已提交 commit + diff）
5. CLI 命令调用

**端到端流程（与 README 一致）：**

```
代码变更 → git diff → AI → commit message → 用户确认 → git commit
    → git log / git show → 代码变更分析 → AI 总结 → 日报
```

---

# MVP功能范围

必须实现：

### 1 获取 Git Commit

支持：

* 本地 Git 仓库
* GitHub
* GitLab

示例：

```
git log --since="today"
```

获取信息：

```
commit id
author
date
message
```

---

### 2 获取代码 diff

示例：

```
git show <commit>
```

或者

```
git diff HEAD~1
```

获取：

* 修改文件
* 代码变更

---

### 3 AI 生成 commit message（提交前）

输入：

```
git diff（或暂存区 diff）
```

输出：

```
建议的 commit message（用户确认后再 git commit）
```

流程要点：仅在工作区/暂存区有变更时生成 message；**不自动提交**，必须用户确认。

---

### 4 AI 生成日报

输入：

```
commit message
diff
```

输出：

```
1. 完成用户登录功能
2. 修复支付异常
3. 优化列表加载速度
```

---

### 5 CLI 使用

示例：

```
worklog today
```

生成 commit message 并交互确认提交：

```
worklog commit
```

输出：

```
今日工作总结
```

---

# MVP不做的功能

第一版 **不做**：

* UI界面
* 团队管理
* 自动发送日报
* 多人协作
* SaaS平台

只做：

**CLI 单机工具**
