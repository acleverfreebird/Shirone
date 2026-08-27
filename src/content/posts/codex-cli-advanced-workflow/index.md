---
title: "Codex CLI 进阶：AGENTS.md、权限控制与项目级工作流"
published: 2026-07-12
description: "从会用到用好 Codex CLI：详解 AGENTS.md 项目指令、沙箱与审批策略、config.toml 配置，以及代码分析、功能开发、审查和自动化等项目级工作流。"
image: ""
tags: ["Codex CLI", "AGENTS.md", "AI编程", "开发工作流", "OpenAI"]
category: "技术教程"
draft: false
lang: "zh-CN"
permalink: "codex-cli-advanced-workflow"
author: "FreeBird"
sourceLink: "https://developers.openai.com/codex/guides/agents-md"
---

# Codex CLI 进阶：AGENTS.md、权限控制与项目级工作流

上一篇文章介绍了 Codex CLI 的安装与 API 接入。这一次不再讨论如何安装，而是解决一个更实际的问题：**怎样让 Codex 在真实项目中稳定工作，而不是每次都从头解释项目规则？**

答案主要由三部分组成：

1. 用 `AGENTS.md` 告诉 Codex 项目约定；
2. 用沙箱和审批策略限定它能做什么；
3. 把“先理解、再修改、最后验证”固化成项目工作流。

> 本文命令基于 `codex-cli 0.139.0` 验证。Codex 仍在快速迭代，选项名称变化时请以 `codex --help` 和 [OpenAI Codex 官方文档](https://developers.openai.com/codex)为准。

---

## 一、为什么需要 AGENTS.md？

Codex 能读取代码，却不会天然知道团队内部的约定。例如：

- 项目使用 `pnpm`，而不是 `npm`；
- 修改完成后必须运行哪些测试；
- 哪些目录是生成产物，不能手动编辑；
- 组件、接口和提交信息采用什么规范；
- 哪些操作具有风险，必须先征得确认。

如果每次对话都重新解释，不仅浪费时间，也容易遗漏。`AGENTS.md` 就是放在仓库中的长期项目说明，作用类似“写给 AI 编程代理的贡献指南”。

Codex 会从项目路径中查找适用的 `AGENTS.md`。当大型仓库的子目录存在更具体的规则时，可以在子目录继续放置 `AGENTS.md`；越靠近当前工作目录的指令越具体，应避免让上下级文件互相矛盾。

一个简洁实用的目录结构如下：

```text
my-project/
├── AGENTS.md              # 全仓库规则
├── package.json
├── src/
│   ├── components/
│   │   └── AGENTS.md      # 组件目录的补充规则
│   └── server/
│       └── AGENTS.md      # 后端目录的补充规则
└── tests/
```

官方说明可参考：[Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)。

---

## 二、一个可以直接使用的 AGENTS.md 模板

`AGENTS.md` 不需要写成厚重的项目文档。最有价值的信息通常是：项目结构、常用命令、代码规范、验证要求和安全边界。

```markdown
# Project Guide

## Overview

- This is an Astro project using TypeScript and Svelte.
- Use pnpm for dependency management.
- Application code lives in `src/`; static assets live in `public/`.

## Commands

- Install dependencies: `pnpm install`
- Start development server: `pnpm dev`
- Run checks: `pnpm check`
- Run tests: `pnpm test`
- Build production output: `pnpm build`

## Code Style

- Follow the existing project structure and naming conventions.
- Prefer TypeScript and keep public types explicit.
- Reuse existing components and utilities before adding abstractions.
- Keep changes scoped to the requested feature.

## Verification

- Run the smallest relevant test first.
- Run `pnpm check` after TypeScript or component changes.
- Run `pnpm build` when changing routes, content schemas, or build config.
- Report commands that could not be run and explain why.

## Safety

- Do not edit generated files in `dist/`.
- Do not commit secrets or print `.env` values.
- Ask before deleting files, changing dependencies, or modifying CI/deployment.
- Never rewrite Git history unless explicitly requested.
```

写这类文件时有三个原则：

### 1. 写可执行的规则

“保证代码质量”过于抽象；“修改 TypeScript 后运行 `pnpm check`”才是可以执行和验证的要求。

### 2. 只写长期约定

某个 Issue 的临时需求应放在本次提示词中，而不是写进 `AGENTS.md`。只有长期适用于仓库或目录的规则，才值得保留。

### 3. 不要堆积重复文档

如果完整规范已经存在于 `CONTRIBUTING.md`，可以在 `AGENTS.md` 中指出必须阅读的章节，再补充 Codex 真正需要的命令和限制。规则越长并不代表执行得越好。

---

## 三、沙箱与审批不是一回事

Codex CLI 的权限控制由两个相互独立的维度组成：

| 维度 | 控制内容 | 常用参数 |
| --- | --- | --- |
| 沙箱 | 命令实际可以访问和修改哪些资源 | `--sandbox` / `-s` |
| 审批 | 什么情况下需要向用户请求确认 | `--ask-for-approval` / `-a` |

把它们分开理解非常重要：审批决定“要不要问”，沙箱决定“即使执行了，能碰到什么”。

### 沙箱模式

当前 CLI 提供三种模式：

| 模式 | 适合场景 |
| --- | --- |
| `read-only` | 阅读代码、分析问题、审查方案，不允许写入 |
| `workspace-write` | 允许修改当前工作区，适合日常开发 |
| `danger-full-access` | 不受工作区沙箱限制，仅适用于已隔离的可信环境 |

只做分析时，可以这样启动：

```bash
codex -s read-only -a untrusted
```

日常开发更适合：

```bash
codex -s workspace-write -a on-request
```

如果项目还需要修改另一个明确的目录，可使用：

```bash
codex -C ./app --add-dir ../shared -s workspace-write
```

### 审批策略

当前 CLI 支持 `untrusted`、`on-request`、`never`，并保留已弃用的 `on-failure`。一般可以这样选择：

- `untrusted`：只有受信任的只读命令可以直接执行，其他命令要求确认；
- `on-request`：由 Codex 在需要突破限制时主动请求批准，适合交互式开发；
- `never`：永不弹出审批，失败直接返回给模型，适合已经隔离好的非交互任务；
- `on-failure`：已弃用，新配置不建议继续采用。

不要为了少点几次确认，就在日常项目里使用：

```bash
codex --dangerously-bypass-approvals-and-sandbox
```

该参数会同时绕过审批和沙箱。它只适合外部已经提供强隔离的一次性环境，例如可随时销毁、没有生产凭据的容器。

更多安全说明见：[Codex security](https://developers.openai.com/codex/security)。

---

## 四、用 config.toml 保存默认配置

不想每次输入相同参数，可以在 `~/.codex/config.toml` 中保存个人默认值：

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"
```

命令行参数可以临时覆盖配置。例如，本次只允许读取：

```bash
codex -s read-only -a untrusted
```

也可以使用 `-c` 覆盖单个配置项：

```bash
codex -c 'sandbox_mode="read-only"'
```

个人配置适合保存“我通常怎样使用 Codex”，而 `AGENTS.md` 适合保存“这个仓库要求怎样工作”。不要把团队的测试规范只放在自己的全局配置中。

配置字段可查阅：[Codex configuration reference](https://developers.openai.com/codex/config-reference)。升级 CLI 后还可以用严格模式检查未知配置：

```bash
codex --strict-config
```

---

## 五、项目级工作流一：先分析，再动手

面对不熟悉的仓库，不要一开始就要求“把这个问题修好”。先让 Codex 建立项目地图，通常能减少无关修改。

第一轮使用只读模式：

```bash
codex -s read-only -a untrusted
```

然后输入：

```text
阅读与文章详情页有关的代码，说明数据从内容集合到页面渲染的完整路径。
先不要修改文件。请列出关键文件、现有测试、可能的回归风险，以及建议的最小修改方案。
```

确认分析正确后，再重新进入可写模式：

```bash
codex -s workspace-write -a on-request
```

```text
按照刚才的最小方案实现修改。遵循 AGENTS.md，先运行相关测试，再运行类型检查。
不要修改与问题无关的文件，最后总结改动和验证结果。
```

这种两阶段流程特别适合陌生代码、跨模块问题和生产项目。

---

## 六、项目级工作流二：用验收条件约束功能开发

高质量提示词不需要很长，但应包含四项内容：目标、范围、验收条件和限制。

```text
为文章列表增加按标签筛选功能。

范围：只修改文章列表及其直接依赖的组件和测试。
验收条件：
1. 可以选择和取消标签；
2. URL 保存当前筛选状态；
3. 浏览器前进、后退可以恢复状态；
4. 移动端不出现横向滚动；
5. 现有测试和构建通过。

限制：复用现有组件和样式，不添加新依赖。先检查仓库实现，再给出计划并完成修改。
```

这里的关键不是告诉 Codex 每一行代码怎么写，而是明确什么结果才算完成。项目内部的通用规则继续由 `AGENTS.md` 提供，两者各司其职。

修改完成后至少人工检查：

```bash
git status
git diff --stat
git diff
```

不要只看 Codex 的总结。真正需要审查的是工作区中的差异和测试结果。

---

## 七、项目级工作流三：代码审查与非交互任务

Codex 提供独立的审查入口：

```bash
codex review
```

也可以直接说明审查重点：

```bash
codex review "重点检查权限绕过、路径处理和缺失的测试"
```

审查时建议关注可复现的缺陷、回归风险和缺少的测试，而不是让模型花大量篇幅讨论格式偏好。

在脚本或 CI 中，可以使用非交互模式：

```bash
codex exec -s read-only -a never \
  "检查本次变更是否存在明显回归，只输出带文件位置的问题"
```

需要机器读取结果时，可以输出 JSONL 事件：

```bash
codex exec --json -s read-only -a never \
  "总结当前项目的测试失败原因"
```

还可以把最终回答写入文件：

```bash
codex exec -o codex-report.md -s read-only -a never \
  "审查当前分支相对主分支的改动"
```

非交互运行不会有人临时批准高风险操作，因此更应该使用最小权限，并避免把生产密钥暴露给任务环境。

---

## 八、常见误区

### 1. 把所有要求塞进一条提示词

长期规则应该进入 `AGENTS.md`，本次任务的目标和验收条件才放在提示词里。这样提示词更短，规则也不容易遗漏。

### 2. 把 workspace-write 当成绝对安全

工作区本身可能包含发布脚本、Git 凭据引用或能影响外部系统的工具。沙箱可以缩小文件访问范围，但不能替代代码审查和凭据隔离。

### 3. 一开始就开放 full access

大多数开发任务只需要修改当前仓库。只有明确知道为什么需要访问工作区之外的资源时，才应该增加目录或调整权限。

### 4. 只要求“修复”，不要求验证

没有测试和构建结果，代码看起来合理并不等于功能正确。把验证命令写入 `AGENTS.md`，并在每次任务中要求报告实际执行结果。

### 5. 让 Codex 自动处理不干净的工作区

开始任务前先运行 `git status`。如果工作区已有自己的修改，应明确哪些文件可以改，避免新修改与未完成工作混在一起。

---

## 九、一套推荐的日常流程

可以把日常使用归纳成下面八步：

1. 在仓库根目录维护简洁、准确的 `AGENTS.md`；
2. 开始前运行 `git status`，确认现有变更；
3. 陌生问题先用 `read-only` 分析；
4. 在提示词中写清目标、范围、验收条件和限制；
5. 日常修改使用 `workspace-write + on-request`；
6. 让 Codex 运行最相关的测试、类型检查和构建；
7. 人工检查 `git diff`，不要只阅读总结；
8. 确认结果后再自行提交和推送。

一条适合作为起点的命令是：

```bash
codex -C /path/to/project -s workspace-write -a on-request
```

配合一条结构清晰的任务描述：

```text
先阅读 AGENTS.md 和相关代码，再实现这个需求。
保持改动范围最小，完成后运行规定的检查，并列出修改文件、验证结果和剩余风险。
```

---

## 十、总结

真正决定 Codex CLI 使用体验的，不只是模型能力，而是项目有没有提供清晰的工作边界。

- `AGENTS.md` 保存长期、可执行的仓库规则；
- 提示词描述本次任务的目标和验收条件；
- 沙箱限制能够访问和写入的范围；
- 审批策略决定什么时候需要人工确认；
- Git 差异和测试结果负责最后把关。

当这些部分组合起来，Codex 才会从“偶尔生成代码的聊天工具”，变成能够参与真实项目开发、同时保持修改可审查的终端助手。

## 参考资料

- [OpenAI Codex Documentation](https://developers.openai.com/codex)
- [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Codex security](https://developers.openai.com/codex/security)
- [Codex CLI reference](https://developers.openai.com/codex/cli/reference)
- [Codex configuration reference](https://developers.openai.com/codex/config-reference)
