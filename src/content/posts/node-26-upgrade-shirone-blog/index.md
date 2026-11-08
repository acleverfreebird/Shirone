---
title: '跟着上游把博客的 Node 升到 26'
author: 'freebird2913'
published: 2026-11-07
description: '合完上游 Shirone 的 17 个提交，发现 Node 最低版本要求涨到了 26.13，本地的 v24.22.1 直接被拦在门外。顺手记一下用 fnm 切到 Node 26、配好 pnpm 11.28.2 并跑通构建的过程。'
image: ''
tags: ['Node.js', 'Shirone', 'Astro', 'pnpm', '博客']
category: '技术教程'
draft: false
lang: 'zh-CN'
excerpt: '合完上游提交才发现 Node 要求涨到了 26.13，本地还是 24。记一下用 fnm 切版本、配 corepack 和重跑构建的过程。'
keywords: ['Node 26', 'fnm', 'pnpm', 'Shirone', 'Astro', '博客升级']
readingTime: 8
---

今天给博客同步上游，17 个提交一路合下来挺顺，自己的配置、文章和头像都没冲掉。正准备收工，扫了一眼 diff，发现 `package.json` 里的 `engines` 变了：

```json
"engines": {
  "node": ">=26.13.0"
}
```

再敲一下本地的 `node -v`，还是 `v24.22.1`。代码没坏，但本地环境已经跑不起来了。

趁着还没关终端，干脆把本地的 Node 和包管理器一并升掉。

## 先摸个底

动手前先看眼机器上的现状和仓库要求：

```bash
node -v
pnpm -v
grep -A 3 '"engines"' package.json
grep packageManager package.json
```

我这台机器当时的情况：Node 是 `v24.22.1`，没装 pnpm，而仓库要求 `node >=26.13.0`，`packageManager` 锁在了 `pnpm@11.28.2`。

要做的事也就清楚了：装个 Node 26，把对应版本的 pnpm 弄出来，再重装依赖跑一遍构建。

## 用 fnm 装 Node 26

以前吃过直接替换系统 Node 的亏，现在换大版本基本都走版本管理器，旧版本留着不动，有问题随时切回去。

我平时习惯用 fnm（Fast Node Manager），够轻，启动也快：

```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

装完重启一下终端（或者按提示 `source` 一下 shell 配置），接着把 26 装上并设为默认版本：

```bash
fnm install 26
fnm use 26
fnm default 26
```

如果本来就在用 nvm，也没必要特意换工具，对应的命令是一样的：

```bash
nvm install 26
nvm use 26
nvm alias default 26
```

跑一下 `node -v`，确认输出是 `v26.x.x` 且不低于 `26.13.0` 就行。要是打出来还是 24，多半是当前终端还没加载 fnm 的环境变量，关掉重开一个窗口就好。

需要回退的时候也省事，旧的 24 还在本地，`fnm use 24`（或者 `nvm use 24`）就能切回去。

## 用 corepack 拉起 pnpm

仓库里锁了 `pnpm@11.28.2`，而且 `preinstall` 脚本加了 `only-allow pnpm`。与其自己全局装一个版本碰运气，不如直接用 Node 自带的 corepack 按项目要求激活：

```bash
corepack enable
corepack prepare pnpm@11.28.2 --activate
pnpm -v
```

输出是 `11.28.2` 就对了。

这里有个小问题要注意：如果机器上以前用 `npm i -g` 或者系统包管理器装过全局 pnpm，PATH 里可能会有两个 pnpm 打架，导致 `pnpm -v` 看到的还是老版本。跑一下 `which pnpm` 看看路径指向哪，把旧的全局包卸掉，让 corepack 接管就行。

## 清依赖、跑检查与构建

回到博客目录，因为跨了 Node 大版本，保险起见我把之前 Node 24 下装的 `node_modules` 删了重装，省得后面碰上莫名其妙的原生模块报错：

```bash
cd ~/workspace/shirone-sync
rm -rf node_modules
pnpm install
```

依赖装好后先跑一遍类型和内容集合检查：

```bash
pnpm astro check
```

Shirone 要求提交前 `astro check` 必须 0 报错。先把 frontmatter 或类型上的问题排掉，免得构建到一半挂掉重来。

检查过了再跑正式构建：

```bash
pnpm build
```

Shirone 的 `build` 串了好几步：同步内容、Astro 构建、生成 Pagefind 搜索索引，最后还要做字体子集和检查，所以耗时比裸跑 `astro build` 长不少。等它跑完，起个预览看一眼：

```bash
pnpm preview
```

去浏览器里翻翻首页和几篇文章，图片、侧边栏、站内搜索都正常，本地这块就妥了。

## 顺手补的两件事

本地跑通之后，还有两个地方最好顺手改掉：

一个是仓库根目录的 `.nvmrc`，写上一行 `26`：

```text
26
```

以后换机器或者重拉仓库，敲 `fnm use` / `nvm use` 就能直接切过去，不用再去翻 `package.json` 看要装哪个版本。

另一个是线上构建环境。本地升完很容易忘掉 GitHub Actions、Vercel 或 Netlify 里的配置。如果那边还停在 24，推上去照样构建失败，记得把部署配置里的 Node 版本也对齐到 26。

## 参考

- Shirone 上游提交 `3e3cebd`：`chore(node): require Node.js 26.13.0`
- 本博客 `package.json`：`engines.node >=26.13.0`，`packageManager pnpm@11.28.2`
- fnm 官方安装文档：https://fnm.vercel.app/
