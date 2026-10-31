---
title: '删掉 astro-icon：把 30,407 个图标压进构建期'
published: 2026-10-31
description: '博客的图标系统推倒重做了一次：从 astro-icon 换成自己生成的构建期图标集合，30,407 个候选图标摇成 156 个字形、14.4 MB 变成 82 KB，纯 SSR 页面里直接出 svg。中间漏过四个箭头、被 pnpm 坑过一回，测试第一版还跑了 67 个假阳性。'
image: ''
tags: ['Astro', 'Svelte', '图标系统', '构建优化', '测试']
category: '技术教程'
draft: false
lang: 'zh-CN'
---

博客的图标系统最近被我推倒重做了一遍，从 `astro-icon` 换成自己生成的构建期图标集合。30,407 个候选图标，真正用上的 156 个，生成文件 82 KB。过程里漏过四个箭头，被 pnpm 的目录结构坑过一回，测试第一版还报了 67 个假阳性。写下来当个记录。

## 空圆圈

这事得从顶栏的设置按钮说起。它某天渲染出来是个空圆圈：边框、圆角、悬停反馈都在，中间什么都没有。

那个按钮是个 Svelte 原子，页面是静态渲染的，没挂 `client:*` 指令。所以浏览器从来没跑过它的脚本，按钮就在那儿，圆的，空的。

控制台很干净，没报错没 404。查下来是 `@iconify/svelte` 的在线 `Icon` 组件的问题：它要靠运行时 `loadIcon()` 拿图标数据，SSR 阶段拿不到，就渲染个空节点；页面要是恰好水合了，它还会顺手往 Iconify 的 API 发个请求。

首屏挂着个第三方请求，图标显示与否全看 JS 跑没跑，这两条都没法忍。当时我想的还只是"把组件换掉"，后来才明白麻烦不在组件本身。

## 30,407 和 156

换之前先算了笔账。可选的路子有三条：

- 运行时调 Iconify API。省事，但要联网，SSR 也用不了。出局。
- 每个图标一个模块。听着挺现代，一篇文章十几个图标就是十几个请求，挺荒唐的。
- 构建期把用到的图标生成成一个模块。零请求，SSR 直出，体积就是这一个文件。

第三条能成立的前提是博客用的图标真不多。四个图标集全量装进来是 30,407 个图标、14.4 MB，全站被引用的只有 156 个。摇完剩下 82,628 字节，就躺在 `src/generated/local-icon-collections.ts` 里。

## 箭头不见了

迁移大体就是把 `name=` 换成 `icon=`。漏了四个跨行的调用点：文章卡片、相关文章、系列卡片上的箭头。`dist/` 里它们是空节点。构建绿的，类型检查绿的，就是没图标。

`astro check` 在这儿帮不上忙，它看不见 Svelte 组件内部转发的 prop 叫什么名字。

`Icon.svelte` 现在还接着 `name`，只在 dev 环境警告一次，而且用模块级的 Set 去重——一个组件渲染一百次就刷一百行警告的话，跟没警告也差不多。

真正拦住这类问题的是后面那份契约测试，一会儿再说。

## pnpm 坑我一回

本来打算只换组件，`astro-icon` 留着。出事的是另一个想法：把 `@iconify-json/*` 从 peer 依赖降成主题自己的 `dependencies`，用户的 `package.json` 里就一个图标集都不用列。

改完，静态检查全绿。真按包模式装一遍，每个图标都抛 `Unable to locate the "material-symbols" icon set!`。

文件明明白白在盘上。`astro-icon` 其实是两步分开的：解析文件是一步，"发现"有哪些集合是另一步。解析那步从 `process.cwd()` 往上找 `icons.json`，pnpm 严格布局下找得到；但发现那步读的是**用户项目的** `package.json`。依赖下沉之后用户的清单里没有 `@iconify-json/*`，发现列表就是空的，虚拟模块导出 `{}`，图标一个都不渲染，还不报错。

就这事让我想明白一句话：想下沉一个依赖，先看消费方是按文件系统找，还是按清单查。按清单查的，除非把消费方换掉，不然永远下不去。

所以 `astro-icon` 就这么没了。新的生成器用 `createRequire(import.meta.url)` 在包内部解析图标集，整条链路里没有"发现"这一步。

## 生成器没有想的那么复杂

`collections.ts` 的主干是个流水账：

1. 扫 `.astro`/`.md`/`.mdx`/`.svelte`/`.ts`/`.tsx`，用一条正则抓 `prefix:name`；
2. 去对应图标集的 `icons.json` 里取字形；
3. 遇到别名就顺着 `parent` 追，追到真实字形为止；
4. 写一个模块出去。

扫描是刻意粗糙的：注释、字符串、真调用一起吃进去，JSDoc 里写句 `material-symbols:home` 的示例也会被当真。省掉一套词法分析，代价是文档里别乱写图标名。我觉得划算。

`generated/` 目录得跳过，不然生成器把自己的上一次输出当输入，图标只增不减。

追别名要记访问路径，两个别名互相指着能绕死，撞上就抛错：

```ts
if (chain.includes(name)) {
  throw new Error(`[local-icons] Circular alias ${prefix}:${[...chain, name].join(" -> ")}`);
}
```

写文件是先写 `.tmp` 再 rename。dev 里生成器和文件监听器是并发的，原地覆写可能让谁读到半个文件；rename 是原子的，不花钱。

## Vite 比我想的早跑一步

生成器原来挂在 `dev`/`build` 的脚本链上，还配了个手写命令 `pnpm icons:generate`。问题是开发服务器开着的时候加个图标，集合不重算，得重启。

改成 Vite 插件。`buildStart` 覆盖 dev/build/sync/check 四个入口，`handleHotUpdate` 覆盖"服务器已经开着"的情况，加了 150ms 防抖，一次保存会触发一串事件。

然后就撞墙了。`Icon.svelte` 写的 specifier 是 `@/generated/local-icon-collections`，可 Vite 在任何插件看到这个 id 之前就把别名解析掉了。插件拿到的 `source` 是 `projectRoot/src/...` 或 `node_modules/shirones/src/...`。`enforce: "pre"` 不管用。

这顺带解释了为什么集合是个真实文件而不是虚拟模块：虚拟模块的 id 得能按 TypeScript 解析（生成内容带 `as const`），打包检查又要求它在盘上真实存在。两个约束一夹，虚拟模块只剩麻烦。

`resolveId` 于是同时认三种写法——裸 specifier、两种解析后的路径——优先指用户那份，没有就回退包里那份：

```ts
resolveId(source) {
  if (source !== ICON_COLLECTIONS_SPECIFIER && ...) return null;
  return existsSync(userCopy) ? userCopy : packageCopy;
}
```

这个回退是两种模式行为一致的关键。包模式下别名指向 `node_modules`，那是插件不该写的地方；不重定向的话，用户自己文章里的图标永远进不了集合。

怎么验证它真指到了用户那份？把包里那份删掉再构建：

```bash
mv node_modules/shirones/src/generated/local-icon-collections.ts{,.bak}
pnpm build   # 仍然成功，说明读的是用户那份
```

（顺带一提，`pnpm build` 只重写 `dist/`，临时消费项目里装的还是旧 tarball。不重新装一遍就动手测，会把好用的重定向看成坏的。）

## 手写 SVG，宽松点

项目自己的 `src/icons/*.svg` 也归这个模块管，挂 `local` 前缀，裸名自动补成 `local:xxx`，保持 `astro-icon` 时代的写法。

解析用的是正则。为了一个目录当前还空着的功能引 SVGO 或者 `@iconify/tools`，不值。宽松的代价是几个细节得自己处理：

- 属性名大小写：`viewbox`、`VIEWBOX` 都可能被手写出来，按 HTML 的规则该忽略大小写，不然 viewBox 丢了整个图标尺寸都错；
- `width="50%"` 没有绝对含义，当缺失处理，让 viewBox 说话；
- `<svg … />` 和 `</SVG>` 里都找不到 `</svg>`，用 `lastIndexOf` 会得 −1，再从负偏移开始切，把后面的整个文档当成图形；
- 空 `<svg>` 是合法 SVG，但不是能用的图标，丢掉。

读不出来的文件一律丢掉，不抛错。手写一个坏文件不该弄挂构建——`astro-icon` 当初也这样。

## 测试

那四个箭头要不要再发生一次？`astro check` 不行，Playwright 也不行：图标 spec 只盖了顶栏、社交链接、复制按钮、FAB，根本没碰过文章卡片。

于是有了源码级契约，扫所有 `.astro`/`.svelte`，断言每个 `<Icon>` 都带 `icon`、不带 `name`。它比浏览器测试更早更便宜，也不需要渲染。

第一版跑出来 67 条失败。不是代码错，是测试天真：`Icon.svelte` 自己的废弃警告文案、JSDoc 里的示例都被当成了调用点。断言之前得先剥掉注释和字符串：

```js
source
  .replace(/\/\*[\s\S]*?\*\//gs, " ")
  .replace(/<!--[\s\S]*?-->/gs, " ")
  .replace(/`[^`]*`/gs, '""')
  .replace(/"[^"\n]*"/gs, '""')
  .replace(/'[^'\n]*'/gs, '""');
```

全是假阳性的测试没人会信，没人信的测试跟没有也差不多。

另外记一笔分工：`astro check` 不查 `.svelte` 内部。有次 `Icon.svelte.d.ts` 把组件声明成了 Svelte 4 的 `SvelteComponent<IconProps>`，`astro check` 报 0 错误，`svelte-check` 在 64 个文件里报 164 条 not assignable——每个 `<Icon>` 调用点一条。两个都得跑。

## 还剩什么

放弃了 `astro-icon` 的 symbol/use 复用，图标都内联成完整 `<svg>`。全站 HTML 实测涨了 0.65%。跨页重复它本来也没解决过。

`pnpm icons:generate` 删掉了，`buildStart` 接上之后没人再调它。

错误策略一半一半：dev 里生成失败只警告，留着上一版集合，一个图标打错字的代价应该是一个图标，不是开发服务器；build 里直接抛错，解析不到的图标运行时就是一片空白，空白这东西最值得让部署挂掉。所以 `dist/` 里要是看到空白图标，那不是错误被吞了，是插件根本没跑。

最后说回那个空圆圈。它出现得其实挺及时——一个按钮能看见的坏，总好过一堆看不见的坏。
