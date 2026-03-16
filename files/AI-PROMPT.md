# Worklog AI Prompt 设计

本项目的核心能力包括：

1. **提交前**：根据 **diff（无 commit message）** 由 AI 生成 **commit message**，用户确认后再提交。
2. **提交后**：将 **Git Commit + Diff** 自动生成 **工作日报 / 周报 / 月报**。

因此 Prompt 设计非常关键（commit message 与日报可用不同模板：前者偏技术摘要与约定式提交，后者偏工作汇报与非技术可读）。

---

# 输入数据结构

AI 输入内容包括：

```
commit message
commit diff
文件变更
```

示例：

```
commit: fix login bug

diff:
src/login.ts
- fix token validation
- add error handling
```

---

# Prompt 设计目标

生成的内容必须：

1. 简洁
2. 适合日报
3. 非技术人员也能看懂
4. 不暴露具体代码细节
5. 支持多语言输出，但**始终保证有一份完整的中文版本（标题 + 内容）**

---

# Prompt 模板

默认中文模板（不带语言参数时）：

```
你是一名软件工程师助理。

任务：
根据 Git commit 和代码变更生成工作日报。

要求：
1. 使用简洁中文
2. 总结为工作事项
3. 不要输出代码
4. 每条一句话
5. 不超过5条

输入：

commit message:
{commit_message}

code diff:
{diff}

输出格式：

今日工作：

1.
2.
3.
```

多语言扩展模板（显式指定 language 时）：

```
你是一名软件工程师助理。

任务：
根据 Git commit 和代码变更生成工作日报。

要求：
1. 始终生成一份简洁的**中文日报**（标题 + 内容），适合发给中国主管
2. 如果 language 不为 "zh" ，在中文日报后面再生成一份目标语言 {language} 的等价日报
3. 不要输出代码
4. 每条一句话，不超过5条

输入：

language: {language}  // 例如 "en"、"ja"

commit message:
{commit_message}

code diff:
{diff}

输出格式（示例）：

中文日报：

今日工作：
1.
2.

{language} 日报：

Today:
1.
2.
```

---

# 示例

输入：

```
commit message:
fix login bug

diff:
login.ts
add token validation
```

输出：

```
今日工作：

1. 修复登录模块中的认证问题
2. 优化用户登录流程稳定性
```

---

# 未来优化

未来可以加入：

* 技术型日报
* 领导汇报型日报
* 产品型日报
* 自动周报 / 月报总结

示例：

```
worklog today --style leader
```
