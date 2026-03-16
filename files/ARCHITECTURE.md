# Worklog 技术架构

整体架构：

```
CLI
 ↓
Git Parser
 ↓
Diff Analyzer
 ↓
AI Summary (language-aware)
 ↓
Report Generator (multi-language)
```

---

# 技术栈

Node.js CLI

核心库：

* commander（CLI框架）
* simple-git（Git操作）
* axios（API请求）

---

# 模块设计

## CLI模块

负责解析命令：

```
worklog today
worklog week
```

---

## Git模块

读取：

```
git log
git diff
```

---

## AI模块

输入：

```
commit
diff
language（可选，默认 zh-CN，对外始终保证生成中文版本）
```

输出：

```
按语言分组的工作总结内容：
- base：中文（必选，标题 + 内容）
- extra：其他语言（如英文），与中文语义对齐
```

---

## Report模块

输出格式：

```
日报
周报
Markdown
多语言文本块（始终包含中文块，可选附加英文等）
```

---

# 代码结构

```
worklog
 ├─ bin
 │   └─ worklog
 ├─ src
 │   ├─ cli
 │   ├─ git
 │   ├─ ai
 │   ├─ report
 │   └─ utils
 ├─ package.json
 └─ README.md
```
