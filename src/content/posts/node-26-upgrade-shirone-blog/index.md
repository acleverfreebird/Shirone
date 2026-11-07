---
title: '把博客的 Node 升到 26：一次不吓人的升级'
author: 'freebird2913'
published: 2026-11-07
description: '上游 Shirone 把 Node 要求提到了 26.13，我的机器还停在 Node 24，pnpm install 直接被拦了下来。这篇记录一次真实的升级：装 fnm、切到 Node 26、激活 pnpm 11，再把博客完整构建一遍，以及几个容易踩的坑。'
image: ''
tags: ['Node.js', 'Shirone', 'Astro', 'pnpm', '博客']
category: '技术教程'
draft: false
lang: 'zh-CN'
excerpt: '上游把 Node 要求提到了 26.13，我的机器还停在 24。这篇记录一次真实的升级：怎么切版本、怎么避坑、怎么确认博客能正常构建。'
keywords: ['Node 26', 'fnm', 'pnpm', 'Shirone', 'Astro', '博客升级']
readingTime: 8
---

## 事情是这样的

今天同步博客上游的时候，一切都很顺利：17 个新提交合进来，自己的配置、文章、头像一张都没丢，合并提交也推上去了。正当我觉得今天可以收工的时候，上游的一行改动跳了出来——

`package.json` 里的 `engines` 改成了：

```json
"engines": {
  "node": ">=26.13.0"
}
```

而我的机器上，`node -v` 还是 `v24.22.1`。

也就是说，从这一版开始，我的博客在本地已经「跑不起来」了。不是代码坏了，是门槛抬高了。这种感觉很熟悉：就像你家楼下开了家新店，门口贴着「本店只接待 26 岁以上」，你 24 岁，只能先去把身份证上的数字改一改。

好消息是，升级 Node 这件事，早就不是「重装系统」级别的大事了。用对工具，十分钟就能搞定。下面是我这次实际走过的路。

## 先看清现状：三条命令

动手之前，先确认自己卡在哪一步：

```bash
node -v
pnpm -v
cat package.json | grep -A 3 '"engines"'
```

我当时的结果是：Node `v24.22.1`，没有装 pnpm，`engines` 要求 `>=26.13.0`。三条信息凑在一起，结论很清楚：先升 Node，再补 pnpm，最后重新装依赖、跑构建。

另外顺便看一眼 `packageManager` 字段：

```bash
grep packageManager package.json
```

我的博客写的是 `pnpm@11.28.2`。这意味着，升级完 Node 之后，pnpm 也要用 11 这个大版本，而不是随便装一个能用的就行。

## 第一步：装一个版本管理器，别动系统自带的 Node

这是整篇最重要的建议：**不要直接去动系统自带的 Node，也不要卸载旧版本。** 用一个版本管理器，让新旧 Node 并存，想切就切，想回滚就回滚。

我用的是 fnm（Fast Node Manager），因为它快、轻，装完就能用：

```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

装完按提示重启一下 shell，或者手动 source 一下它写进你 shell 配置里的那几行。然后：

```bash
fnm install 26
fnm use 26
fnm default 26
```

这三行分别是在说：装一个 Node 26、这次会话先用它、以后默认都用它。

如果你已经在用 nvm，也完全不用换，做法是一样的：

```bash
nvm install 26
nvm use 26
nvm alias default 26
```

装完验证一下：

```bash
node -v
```

看到 `v26.x.x`，并且版本号不低于 `26.13.0`，这一步就算成了。如果显示的还是 24，大概率是 shell 没重新加载版本管理器的初始化脚本，重启终端再试一次，别急着怀疑人生。

## 第二步：把 pnpm 也扶起来

Node 26 自带 corepack，可以直接激活项目指定的 pnpm 版本：

```bash
corepack enable
corepack prepare pnpm@11.28.2 --activate
pnpm -v
```

看到 `11.28.2`，就对上了。`corepack prepare` 的好处是，它装的是项目要的那个精确版本，而不是「最新版」，以后换机器、换同事，都不会因为 pnpm 版本不一致出幺蛾子。

如果你以前是全局装的 pnpm，这一步之后可能会出现两个 pnpm 打架。判断方法很简单：`which pnpm` 看它指向哪，再看 `pnpm -v` 是不是 11.28.2。不是的话，先把旧的全局 pnpm 卸掉，让 corepack 的版本说了算。

## 第三步：进博客目录，重新装依赖、跑构建

现在回到博客仓库：

```bash
cd ~/workspace/shirone-sync
pnpm install
```

如果之前是用 Node 24 装过依赖，建议先把旧的依赖目录清掉再装，免得新旧混在一起：

```bash
rm -rf node_modules
pnpm install
```

装完先别急着构建，先跑检查：

```bash
pnpm astro check
```

这一步是 Shirone 自己的规矩：提交之前，`astro check` 必须 0 报错。它会帮你把类型错误、内容集合的问题提前揪出来，比构建到一半才炸要体面得多。

检查通过了，再跑完整构建：

```bash
pnpm build
```

注意，这个项目的 `build` 脚本不只是 `astro build`，它还会先同步内容、再跑 pagefind 索引、最后检查字体。所以构建时间会比你想象的长一点，耐心等它跑完。构建成功后，可以本地预览确认一下：

```bash
pnpm preview
```

打开浏览器看一眼首页和文章页，图片、侧边栏、搜索都正常，就可以放心了。

## 几个容易踩的坑

**坑一：只升了 Node，忘了 pnpm。**

Node 26 装好了，`pnpm install` 却报 `only-allow pnpm` 之类的错，或者 pnpm 版本不对。记住，`package.json` 里的 `preinstall` 脚本会强制只允许 pnpm，而且版本要对得上 `packageManager` 字段。先 `corepack prepare`，再 `pnpm install`。

**坑二：旧的 node_modules 没清。**

用 Node 24 装出来的依赖目录，直接拿给 Node 26 用，有时会出一些很玄学的错误。升级大版本的时候，`rm -rf node_modules` 再重装，是最便宜的保险。

**坑三：.nvmrc 没写，换台机器又忘了。**

建议在仓库根目录放一个 `.nvmrc`，里面只写一行：

```text
26
```

这样以后在新机器上，`fnm use` 或 `nvm use` 会自动读到这个文件，不用再凭记忆想「我上次装的是哪个版本」。

**坑四：CI 和部署环境也要同步升。**

本地升完了别忘了，GitHub Actions、Netlify、Vercel 这些地方的 Node 版本也要改成 26，不然本地能构建，线上照样失败。部署配置里的 Node 版本，和 `engines` 字段要保持一致。

## 万一想回滚，怎么办

升级最让人安心的部分，是回滚特别容易。因为旧版本根本没删：

```bash
fnm use 24
# 或者
nvm use 24
```

切回去，`node -v` 又是 24 了。等新版本的问题搞清楚了，再切回来就行。版本管理器存在的意义，就是让「试试」这件事没有代价。

## 写在最后

这次升级本身没什么技术含量，真正的收获是另外一件事：我的博客和上游主题之间，终于又站在同一条起跑线上了。

以前我总觉得「升级 Node」是一件要留出半天、泡好茶、关掉所有窗口才能干的事。这次走下来发现，真正花时间的部分不是升级，而是之前一直拖着没升级——拖到上游把门槛抬起来了，才不得不做。

所以如果你也有一台还停在 Node 24 的机器、一个好久没构建的博客，别等了。今晚花十分钟，把 Node 升到 26，把构建跑通一次。剩下的时间，留给写文章。

## 参考

- Shirone 上游提交 `3e3cebd`：`chore(node): require Node.js 26.13.0`
- 本博客 `package.json`：`engines.node >=26.13.0`，`packageManager pnpm@11.28.2`
- fnm 官方安装文档：https://fnm.vercel.app/
