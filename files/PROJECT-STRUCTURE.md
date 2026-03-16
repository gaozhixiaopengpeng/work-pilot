# Worklog 项目结构

推荐结构：

```
worklog
├─ bin
│   └─ worklog
├─ src
│   ├─ cli
│   │   └─ index.ts
│   ├─ git
│   │   ├─ log.ts
│   │   └─ diff.ts
│   ├─ ai
│   │   └─ summarize.ts
│   ├─ report
│   │   └─ generate.ts
│   └─ utils
│       └─ format.ts
├─ prompts
│   ├─ daily.md
│   └─ weekly.md
├─ package.json
└─ README.md
```

---

# 目录说明

## bin

CLI 入口文件

```
worklog today
```

---

## src/cli

命令解析

```
worklog today
worklog week
```

---

## src/git

Git 数据读取

功能：

```
git log
git diff
```

---

## src/ai

AI 调用模块

功能：

```
调用 LLM
生成日报（支持多语言，默认中文，始终包含中文版本）
```

---

## src/report

生成最终报告

输出：

```
Markdown
Text
多语言文本块（其中中文为必选，其他语言为可选扩展）
```

---

# CLI入口示例

bin/worklog

```
#!/usr/bin/env node

import "../src/cli"
```

---

# CLI示例

```
worklog today
worklog week
worklog today --repo ./project
```

---

# MVP目标

第一版只实现：

1. 本地 Git
2. commit 获取
3. diff 获取
4. AI 总结
5. CLI 输出
