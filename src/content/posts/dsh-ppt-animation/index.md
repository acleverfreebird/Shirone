---
title: '让 PowerPoint 自己写动画：一个 PPT 动画插件的做法'
author: 'freebird2913'
published: 2026-11-22
description: '手写 PPT 动画的 timing XML，能凑出结构，但 PowerPoint 认不认是另一回事。这个 DeepSeek Harness 插件换了个思路：用 COM 驱动 PowerPoint，把 160 个效果、每个方向、150 个切换各生成一遍，抽出 XML 编译成模板库。插件运行时只重排 id、分配 grpId、写参数。'
image: './images/ppt-anim-hero.png'
tags: ['PPT', 'PowerPoint', '动画', '插件', 'DeepSeek']
category: 'AI工具'
draft: false
lang: 'zh-CN'
excerpt: '手写 PPT 动画 XML 能凑出结构，但 PowerPoint 认不认是另一回事。这个插件换了个思路：让 PowerPoint 自己把每个效果写一遍，抽出来编译成模板库，运行时只重排 id、写参数。'
keywords: ['PPT 动画', 'PowerPoint', 'timing XML', 'DeepSeek Harness', '插件']
readingTime: 7
---

![一张活过来的幻灯片：元素沿着光轨运动，下方是动画时间轴](./images/ppt-anim-hero.png)

*本文配图均为 AI 生成的示意图，非产品截图；文中另有两张仓库自带的演示稿截图，会单独注明。*

## 先说一个手写动画的教训

给 PPT 加动画，说到底就是往文件里写一段 `<p:timing>` XML。手写并不难：淡入、出现、飞入，结构都能凑对，文件也能打开。但有个问题一直悬着：LibreOffice 预览只显示最终静止的画面，动画到底播不播得对，写的人说了不算，PowerPoint 说了才算。

效果体（`animEffect`、`animScale`、`animRot`、`animMotion`）里的细节很多，手写能凑出「看起来对」的结构，但 PowerPoint 打开时会不会静默改写、会不会弹修复提示，光看 XML 是看不出来的。

[dsh-ppt-animation](https://github.com/acleverfreebird/dsh-ppt-animation) 这个项目就是冲着这个问题去的。它是一个 DeepSeek Harness 插件，能生成 PPT 并写入真正的动画和切换，而它的做法一句话就能说清：**不手写，让 PowerPoint 自己写一遍，然后抄下来。**

![插件生成的演示稿封面](https://raw.githubusercontent.com/acleverfreebird/dsh-ppt-animation/main/docs/images/cover.png)

## 核心做法：采样，而不是手写

整个项目分两步。第一步是「采样」：用 COM 自动化驱动 PowerPoint，对 160 个 effect id、每个效果的方向变体、150 个幻灯片切换各生成一页，把每页的 `<p:timing>` 和 `<p:transition>` 抽出来，去掉节点 id 和目标形状，编译成三个模板库文件（效果、方向、切换）。

第二步才是插件运行时做的事，而且少得惊人：把模板拿出来，重排时间节点 id、分配 `grpId`，再按请求写上时长、延迟、方向和修饰。效果体本身一个字不改——那是 PowerPoint 的原话。

好处也直接：生成出来的动画，就是 PowerPoint 自己会写的那种动画，不存在「格式猜错了」的空间。

![采样：让 PowerPoint 把每个效果写一遍，抽出来归档成模板库](./images/ppt-anim-sampling.png)

*采样这一步的示意：左边是 PowerPoint 逐个生成效果，右边是归档好的模板库（AI 生成的示意图）。*

## 采样还挖出两条没写在文档里的规则

这是我觉得整个项目最有意思的部分。采样和验证过程中，碰到两条任何文档都没写的规则：

第一，**同一个形状的第二个动画必须递增 `grpId`**，否则 PowerPoint 会把它们合并。实测：两个 0.6 秒的 pulse 动画，grpId 都是 0，打开后变成了一条 1.2 秒的动画。这种坑，手写 XML 的人可能一辈子都不知道自己踩了，只会觉得「动画好像不太对」。

第二，**按段落构建的动画共用一个 `grpId`，并标记 `build="p"`**。要让一个文本框的段落逐条出现，不是给每段写一条独立动画那么简单，PowerPoint 自己就是这么写的，抄下来才知道。

## 插件能做什么

插件提供四个工具：

- `ppt_build_deck`：从一份 spec 生成 .pptx，可同时写入动画和切换，返回每页的形状名清单；
- `ppt_animate`：往任意已有的 .pptx 里写动画时间轴；
- `ppt_transition`：设置、修改、移除幻灯片切换；
- `ppt_animation_inspect`：回读任意文件的每页切换和按播放顺序排列的每条动画。

能力上，生成有 8 种版式（封面、章节、要点、KPI、步骤、卡片、引言、结尾），深色渐变主题，所有形状都命名了，可以按名字寻址。动画有 94 个效果，涵盖入场、强调、退出，外加 40 条命名运动路径。12 个效果支持方向变体（上、下、左、右、水平、垂直、顺时针、逆时针）。**不支持的组合直接报错，而不是等 PowerPoint 打开时静默改写**——这个态度我很喜欢：宁可现在告诉你不行，也别让你在演示现场发现不对。

文本框可以按段落拆成一组效果（`byParagraph`），运动路径可以自定义 2 到 64 个点，修饰有重复播放、自动往返、平滑开始和结束。时序触发有四种：点击、与上一动画同时、接上一动画之后，还有一个 `auto`，随翻页自动播放。

`auto` 这个设计很实用。演示稿最怕第一页打开是空白，要点一下才有东西。用 `auto` 让每页第一个动画随翻页自己播，后面的再等点击。仓库里那份 10 页的演示稿就是这样配的：89 条动画，总共只需要 9 次点击，章节页和结尾页完全自动。

## 验证方式：不自证，让 PowerPoint 读回来

生成工具最容易陷入的陷阱是「我觉得写对了」。这个项目的验证方式是让 PowerPoint 本人来判：用 COM 打开生成的文件，把主时间轴里每条动画的类型、触发方式、时长、段落、方向参数逐条读回来，再和预期对比，切换效果也一样。

![回读校验：让 PowerPoint 打开文件，把每条动画逐条读回来核对](./images/ppt-anim-verify.png)

*回读校验的示意：不靠生成方自述，让 PowerPoint 打开后逐条核对（AI 生成的示意图）。*

仓库里那份演示稿的最新结果：PowerPoint 打开正常（`openOk=True`），89 条动画、10 个切换全部读回无误，没有修复提示，验证报告就提交在仓库的 `docs/verify-final.json` 里，谁都能查。

![演示稿里的步骤页](https://raw.githubusercontent.com/acleverfreebird/dsh-ppt-animation/main/docs/images/steps.png)

## 已知限制，也写得很诚实

README 里专门有一节讲限制，我挑三条：

- **Morph（平滑切换）不支持**。不是没做，是实测发现他们那台 PowerPoint 16.0 保存时会把 `<p14:morph>` 直接丢弃，所以干脆不放进库里，而不是假装支持。这一条特别对我的胃口：测出来不行，就写明不行。
- 自定义路径写在一个叫 `path-left` 的预设上，动画窗格里显示的名字是「Left」，但实际轨迹是你给的那串点，往返保存后不变。
- 只支持按段落构建，没有按词、按字母；`ppt_animate` 是整页时间轴替换，不做追加合并。

安装方面，它是标准的 DSH bundle，装的时候选 `packages/ppt-animation` 目录（不是仓库根目录，这一点 README 里反复强调）。生成和配动画不需要装 Office，插件本身跨平台；只有采样和 COM 复核的工具是 Windows 加 PowerPoint 专属。MIT 许可。

## 写在最后

这个项目真正值得抄的不是代码，是方法：**与其猜一个格式的细节，不如让格式的作者自己生成一遍，然后把它的输出变成你的模板。**

动画 XML 是这样，很多「文档写不全、实现说了算」的格式都是这样。手写效果的时候，人总以为问题在写得对不对；看完这个仓库才明白，问题在你根本不知道自己错没错。采样加回读，把「不知道」变成了「可验证」。

仓库地址：[github.com/acleverfreebird/dsh-ppt-animation](https://github.com/acleverfreebird/dsh-ppt-animation)，里面有一份插件自己生成、自己配动画的 10 页演示稿，可以直接下载来放一遍。
