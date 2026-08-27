---
title: "Codex CLI 实战：用 AI 代理维护 Astro 博客的完整工作流"
published: 2026-08-05
description: "以 Mizuki / Astro 博客为例，整理一套可落地的 Codex CLI 内容维护工作流，覆盖 AGENTS.md 项目约定、文章创建、配置修改、构建检查、代码审查与安全边界。"
image: ""
tags: ["Codex CLI", "Astro", "AI编程", "博客建设", "开发工作流"]
category: "技术教程"
draft: false
lang: "zh-CN"
permalink: "codex-cli-astro-blog-workflow"
author: "FreeBird"
sourceLink: "https://developers.openai.com/codex"
---

# Codex CLI 实战：用 AI 代理维护 Astro 博客的完整工作流

前两篇文章分别介绍了 Codex CLI 的安装接入，以及 AGENTS.md、权限控制和项目级工作流。这一篇换一个更贴近日常的场景：**如何用 Codex CLI 维护一个 Astro 技术博客**。

本文以当前 Mizuki / Astro 博客结构为例，关注的不是“让 AI 帮我随便写点东西”，而是把内容维护、配置修改、构建检查和风险控制串成一套可以重复使用的流程。

适合阅读本文的人：

- 已经有一个 Astro、Vite、Next.js 或类似静态博客项目；
- 希望用 AI 辅助写文章、改配置、查构建问题；
- 不想让 AI 在项目里乱改文件；
- 想把“写文章”和“验证发布”变成稳定流程。

---

## 一、为什么博客项目很适合用 Codex？

个人博客看起来只是写 Markdown，但真实维护时经常会遇到这些小任务：

- 新建文章目录和 frontmatter；
- 统一标题、摘要、标签、分类；
- 调整导航、侧边栏、友链、设备页等配置；
- 修复 Markdown 渲染、图片路径、代码高亮问题；
- 写完文章后运行类型检查和构建；
- 批量修改旧文章中的链接或格式。

这些任务单独看都不难，但很容易分散注意力。Codex 的价值在于：它可以读取项目上下文，理解现有文件结构，然后按你的规则修改文件、运行命令、根据报错继续修复。

对 Astro 博客来说，Codex 特别适合做三类事情：

| 场景 | Codex 适合做什么 | 你需要把关什么 |
| --- | --- | --- |
| 内容创作 | 生成文章大纲、补全教程步骤、整理命令 | 观点、真实性、个人表达 |
| 内容维护 | 调整 frontmatter、统一标签、修复链接 | 是否符合博客定位 |
| 工程维护 | 跑测试、看构建错误、修改组件或配置 | 是否影响现有页面 |

一句话总结：**让 Codex 做重复、细碎、需要上下文的工作；你负责方向、判断和最终发布。**

---

## 二、先让 Codex 理解博客结构

在一个 Astro 内容站中，Codex 首先需要知道文章放在哪里、配置放在哪里、验证命令是什么。

以 Mizuki 这类项目为例，常见结构大致如下：

```text
src/
├── content/
│   └── posts/
│       └── example-post/
│           └── index.md
├── content.config.ts
├── config/
│   ├── navBarConfig.ts
│   ├── sidebarConfig.ts
│   └── siteConfig.ts
└── pages/

public/
├── images/
└── assets/

package.json
```

文章通常采用 Page Bundle 形式：

```text
src/content/posts/my-new-post/
├── index.md
└── image.png
```

这样做的好处是文章正文和配图放在一起，迁移、备份和重命名都更清晰。

在让 Codex 开始写之前，可以先给它一个只读任务：

```text
请先阅读这个 Astro 博客项目的文章目录、content schema 和 package.json，
总结新建一篇文章需要遵守哪些 frontmatter 字段、目录结构和验证命令。
暂时不要修改文件。
```

这一步很重要。Codex 只有先看过项目，才知道应该创建 `src/content/posts/<slug>/index.md`，而不是随手在根目录写一个 `post.md`。

---

## 三、给博客写一个 AGENTS.md

`AGENTS.md` 是写给 Codex 的项目规则。它适合保存长期约定，例如项目结构、常用命令、写作格式和安全边界。

对于 Astro 博客，可以在仓库根目录放一个简洁版本：

```markdown
# Project Guide

## Overview

- This is an Astro static blog.
- Use pnpm for dependency management.
- Blog posts live in `src/content/posts`.
- Each post should be a folder containing `index.md`.

## Writing Rules

- Write posts in Simplified Chinese unless the user asks otherwise.
- Use existing frontmatter style from nearby posts.
- Prefer practical tutorials with clear steps, commands, and notes.
- Do not invent external facts. Ask to verify or cite official sources when needed.

## Commands

- Start dev server: `pnpm dev`
- Type/content check: `pnpm check`
- Unit tests: `pnpm test`
- Production build: `pnpm build`

## Safety

- Do not edit generated files in `dist/`.
- Do not delete existing posts unless explicitly requested.
- Do not print secrets from `.env`.
- Ask before changing dependencies, deployment config, or licenses.

## Verification

- For content-only changes, run `pnpm check` when frontmatter or schema may be affected.
- Run `pnpm build` before publishing if routes, config, Markdown plugins, or images changed.
- Report any command that fails and include the relevant error summary.
```

AGENTS.md 不需要写得很长。它最重要的作用是让 Codex 每次进入项目时都知道：

1. 文章应该放在哪里；
2. 什么文件不能碰；
3. 修改后要跑什么命令；
4. 博客文章应该保持什么风格。

如果某个子目录有特殊规则，也可以继续放更具体的 AGENTS.md。例如 `src/content/posts/AGENTS.md` 专门规定文章格式，`src/components/AGENTS.md` 专门规定组件开发方式。

---

## 四、用 Codex 创建一篇新文章

最简单的用法是直接描述目标：

```text
帮我新建一篇文章，主题是“用 Cloudflare Workers 部署 Umami 代理”，
要求沿用当前博客的 frontmatter 格式，放在 src/content/posts/umami-worker-proxy-guide/index.md。
文章写成中文技术教程，包含背景、准备工作、部署步骤、常见问题和发布前检查。
```

如果你已经有想法，但还没有大纲，可以先让 Codex 只做规划：

```text
我想写一篇关于 Astro 博客 SEO 优化的文章。
请先阅读现有文章风格，然后给我 3 个选题角度和推荐大纲。
暂时不要创建文件。
```

当方向确定后，再让它落稿：

```text
按你推荐的第 1 个方向写完整文章。
要求：
- 新建目录 src/content/posts/astro-seo-practical-checklist
- 正文不少于 2500 字
- 包含可执行命令
- 不要修改其它文章
- 写完后运行 pnpm check
```

这里有一个小技巧：**任务越具体，Codex 越稳定。**

不要只说：

```text
帮我写篇博客。
```

更好的说法是：

```text
帮我写一篇中文技术教程，主题是“WSL2 中安装 Kali Linux 并配置开发环境”。
读者是刚接触 Linux 的 Windows 用户。
文章结构包括：适用场景、安装 WSL2、安装 Kali、更新源、安装常用工具、VS Code 连接、常见问题。
放到 src/content/posts/wsl2-kali-linux-guide/index.md。
```

这类提示能把主题、读者、结构、路径和格式一次性说明清楚。

---

## 五、让 Codex 修改博客配置

除了写文章，Codex 也适合处理配置类任务。例如：

- 添加导航菜单；
- 调整站点标题、描述、头像；
- 更新友链；
- 修改音乐播放器列表；
- 调整侧边栏组件顺序；
- 批量规范标签名称。

配置修改的提示词建议带上“先阅读再修改”：

```text
请帮我把导航栏里增加一个“AI工具”入口。
先阅读 src/config/navBarConfig.ts 和相关页面路由，
确认现有写法后再修改。
修改完成后运行 pnpm check。
```

如果是批量修改内容，建议要求 Codex 先列出影响范围：

```text
请检查 src/content/posts 下所有文章的 tags，
找出“AI编程”“AI 编程”“人工智能编程”这类可能重复的标签。
先给我一份归并建议，不要直接修改。
```

等你确认后再执行：

```text
按刚才的归并建议修改标签。
只修改 frontmatter 中的 tags 字段，不改正文。
```

这样可以避免 AI 把正文里的自然表达也一起替换掉。

---

## 六、建立发布前检查清单

写完文章后，不建议直接提交或发布。至少做一轮检查：

```bash
pnpm check
pnpm test
pnpm build
```

不同命令关注点不同：

| 命令 | 作用 | 什么时候必须跑 |
| --- | --- | --- |
| `pnpm check` | 检查 Astro、TypeScript、内容 schema | 新文章、frontmatter、组件改动 |
| `pnpm test` | 运行项目测试 | 修改 Markdown 插件、工具函数、加密逻辑 |
| `pnpm build` | 生产构建和搜索索引生成 | 发布前、改路由、改配置、改图片 |

你可以直接把检查清单交给 Codex：

```text
请检查刚才新增的文章是否符合 content schema。
然后运行 pnpm check。
如果失败，请分析错误并修复。
不要修改无关文件。
```

如果构建失败，也不要急着手动搜索。可以让 Codex 按错误定位：

```text
pnpm build 失败了。
请根据终端错误定位原因，只修改必要文件。
修复后重新运行 pnpm build。
```

构建错误通常来自几类问题：

- frontmatter 字段类型不对，例如 `published` 不是合法日期；
- 图片路径错误；
- Markdown 表格、代码块、数学公式未闭合；
- 某个组件改动影响了 SSR 构建；
- 文章里使用了不被当前插件支持的语法。

Codex 擅长根据错误堆栈回到对应文件，但你仍然要看最终 diff，确认它没有顺手改掉无关内容。

---

## 七、权限策略：不要一上来就全放开

Codex CLI 的权限可以分成两个层面理解：

- 沙箱：限制命令能访问和修改哪些资源；
- 审批：决定什么时候需要向用户确认。

日常维护博客时，推荐从较保守的方式开始：

```bash
codex -s workspace-write -a on-request
```

这个组合适合多数本地项目：允许 Codex 修改当前工作区，但遇到更敏感的操作时仍然需要确认。

如果只是让 Codex 阅读文章、总结结构、做代码审查，可以使用只读模式：

```bash
codex -s read-only -a untrusted
```

不建议在日常博客目录里长期使用完全绕过限制的模式。它虽然方便，但一旦提示词写错或命令范围过大，风险也会变高。

一个简单原则是：

| 任务 | 推荐权限 |
| --- | --- |
| 阅读项目、总结文章风格 | read-only |
| 新建文章、修改配置 | workspace-write |
| 批量重命名、删除文件、改依赖 | 先人工确认 |
| 生产服务器操作 | 不建议直接交给 Codex 执行 |

AI 代理可以帮你提速，但不应该替代基本的工程边界。

---

## 八、适合博客维护的提示词模板

下面这些模板可以直接复制使用。

### 1. 新建文章

```text
请在当前 Astro 博客中新增一篇文章：

主题：
<写你的主题>

要求：
- 阅读现有文章风格和 content schema
- 新建到 src/content/posts/<slug>/index.md
- 使用中文
- frontmatter 沿用现有文章格式
- 分类为“技术教程”
- draft: false
- 正文包含背景、步骤、注意事项、常见问题、总结
- 不修改其它文件
```

### 2. 优化旧文章

```text
请优化这篇文章：
src/content/posts/<post>/index.md

目标：
- 保留原意
- 优化标题层级
- 补充步骤说明
- 修复不清晰的命令解释
- 不改变 permalink
- 不修改图片文件

完成后总结改了哪些部分。
```

### 3. 检查发布风险

```text
请对最近修改的文章做发布前检查：
- frontmatter 是否符合 schema
- 标题、description、tags 是否适合 SEO
- Markdown 代码块是否闭合
- 本地图片路径是否存在
- 是否有明显事实错误或过时表述

先报告问题，不要直接修改。
```

### 4. 处理构建失败

```text
pnpm build 失败了。
请阅读错误输出，定位最小修改范围。
只修复导致构建失败的问题，不做额外重构。
修复后重新运行 pnpm build。
```

### 5. 文章系列规划

```text
请基于当前博客已有文章，帮我规划一个“AI 编程工具”系列。
要求：
- 先列出现有相关文章
- 找出缺失主题
- 给出 5 篇后续选题
- 每篇包含标题、摘要、标签和目标读者
暂时不要创建文件。
```

---

## 九、一个完整工作流示例

下面是一套比较稳的博客维护流程：

### 第一步：让 Codex 读项目

```text
请阅读当前 Astro 博客项目，重点看 package.json、src/content.config.ts 和 src/content/posts。
总结文章格式、常用命令和新建文章的目录规范。
不要修改文件。
```

### 第二步：确认选题和大纲

```text
我想写一篇“Codex CLI 维护 Astro 博客”的教程。
请根据当前博客风格给出大纲和写作重点。
```

### 第三步：生成文章

```text
按这个大纲新建完整文章。
路径：src/content/posts/codex-cli-astro-blog-workflow/index.md
要求文章偏实战，包含 AGENTS.md 示例、提示词模板和发布前检查。
```

### 第四步：检查内容 schema

```text
请检查新增文章的 frontmatter 是否符合 src/content.config.ts。
如果没有问题，运行 pnpm check。
```

### 第五步：构建验证

```text
请运行 pnpm build。
如果失败，只修复和新增文章直接相关的问题。
```

### 第六步：查看 diff

```text
请总结本次修改的文件和内容，不要提交。
```

最后由你自己预览文章、确认表达和事实，再决定是否提交。

---

## 十、常见问题

### Codex 写出来的文章会不会太像 AI？

会，所以不要把“生成初稿”当成最终发布。更好的方式是让 Codex 做结构、步骤和补全，你自己补充真实经验、踩坑记录、截图和个人判断。

技术博客最有价值的部分往往不是“某个命令怎么写”，而是：

- 为什么选这个方案；
- 哪一步容易失败；
- 失败后你怎么定位；
- 这个方案适不适合长期使用。

这些内容最好由作者亲自把关。

### 要不要让 Codex 自动提交？

个人项目可以，但我更建议先让 Codex总结 diff，再由你提交。尤其是文章发布，标题、摘要、分类、SEO 描述都带有个人判断，不适合完全自动化。

### Codex 能不能直接帮我查资料？

可以，但资料类文章要特别谨慎。写到 API、模型、价格、政策、软件版本时，最好要求它引用官方文档或让它明确说明信息来源。越是容易变化的内容，越不能只靠记忆。

### AGENTS.md 越详细越好吗？

不一定。太长的规则反而容易互相冲突。建议先写项目结构、命令、安全边界和文章风格，后续遇到重复问题再补充。

---

## 总结

Codex CLI 用在 Astro 博客上，并不是为了取代作者，而是让作者少被重复劳动打断。

一套稳定的流程可以概括为：

1. 先让 Codex 读取项目结构；
2. 用 AGENTS.md 固化长期规则；
3. 新文章明确主题、路径、读者和结构；
4. 配置修改前先确认影响范围；
5. 发布前运行 `pnpm check`、`pnpm test`、`pnpm build`；
6. 最后由作者检查 diff 和文章表达。

如果你已经在维护自己的 Astro 博客，可以从一个很小的任务开始：让 Codex 阅读你的 `src/content/posts`，总结现有文章风格，然后帮你生成下一篇文章的大纲。

当这套流程跑顺之后，AI 就不只是聊天窗口里的助手，而会变成博客维护中的一个稳定协作者。

## 参考资料

- [OpenAI Codex](https://developers.openai.com/codex)
- [AGENTS.md 项目指令说明](https://developers.openai.com/codex/agent-configuration/agents-md)
- [Codex CLI 配置参考](https://developers.openai.com/codex/config)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
