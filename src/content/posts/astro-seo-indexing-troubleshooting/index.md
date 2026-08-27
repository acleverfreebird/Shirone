---
title: "Astro 博客文章不被收录怎么办？从页面、Sitemap 到 Search Console 的排查清单"
published: 2026-07-24
description: "面向 Astro、Mizuki、Fuwari 等静态博客的搜索引擎收录排查指南，按页面访问、robots.txt、sitemap、canonical、Search Console、Bing Webmaster Tools 和 IndexNow 逐步定位问题。"
tags: ["Astro", "SEO", "Search Console", "Bing", "Sitemap", "故障排查"]
category: "SEO优化"
draft: false
lang: "zh-CN"
---

写博客最容易让人焦虑的事情之一是：文章已经发布了，链接也能打开，但 Google 或 Bing 里怎么搜都搜不到。

很多人第一反应是“是不是 SEO 没做好”，然后开始改标题、堆关键词、反复提交链接。其实在真正优化内容之前，应该先确认一件更基础的事：**搜索引擎到底能不能发现、抓取并理解这个页面**。

这篇文章不讲大而全的 SEO 理论，只给一套排查路径。你可以从上到下检查一遍，基本就能判断问题属于哪一类：

- 页面没有正常生成
- 部署环境不是最新版本
- robots.txt 阻止了爬虫
- sitemap 没包含文章
- canonical 指到了错误地址
- 页面带了 noindex
- 搜索平台已经发现，但暂时没有编入索引
- IndexNow 推送成功，但搜索引擎还没有收录
- 站内搜索和搜索引擎索引被混为一谈

下面用 `example.com` 作为示例域名，实际操作时替换成你自己的站点地址。

## 先判断是不是真的没收录

“搜不到”不等于“没收录”。先把几个概念分开：

- **抓取**：搜索引擎爬虫访问了你的页面。
- **索引**：搜索引擎把页面纳入数据库，有机会出现在搜索结果里。
- **排名**：页面虽然被索引了，但不一定排在前面。
- **站内搜索**：比如 Pagefind，只影响你网站自己的搜索框，和 Google/Bing 是否收录不是一回事。

建议按下面几种方式判断：

```txt
site:example.com 文章标题
```

这个命令可以粗略检查某个域名下有没有相关结果。

```txt
site:example.com/posts/my-post/
```

这个更适合检查具体 URL 是否进入结果页。

也可以直接搜索完整 URL：

```txt
https://example.com/posts/my-post/
```

但这些搜索语法都不是绝对准确的。最可靠的方式还是去 Google Search Console 里使用“网址检查”，或者在 Bing Webmaster Tools 里使用 URL 检查。

如果文章刚发布几分钟甚至几个小时，暂时搜不到很正常。搜索引擎发现和收录页面需要时间，尤其是新站、低权重站、更新频率不稳定的网站。

## 确认文章页面真的在线

第一步不要看 SEO 工具，先看文章页面本身。

在浏览器打开：

```txt
https://example.com/posts/my-post/
```

如果你自己都打不开，搜索引擎当然也无法收录。

更稳妥的方式是检查 HTTP 状态码：

```bash
curl -I https://example.com/posts/my-post/
```

常见结果可以这样理解：

| 状态码 | 含义 | 是否正常 |
| --- | --- | --- |
| `200` | 页面正常返回 | 正常 |
| `301` / `308` | 永久跳转 | 需要确认跳到正确地址 |
| `302` / `307` | 临时跳转 | 通常不建议长期用于正式文章 |
| `404` | 页面不存在 | 不正常 |
| `500` | 服务器错误 | 不正常 |

如果返回的是跳转，要继续看 `Location` 是否是你想要的正式域名。

```bash
curl -I https://example.com/posts/my-post/
```

如果它跳到了 Vercel 预览域名、Netlify 默认域名、旧域名，或者没有 HTTPS 的地址，就需要先修复站点配置。

Astro、Mizuki、Fuwari 这类静态博客还有一个常见误区：**本地开发服务器能看到文章，不代表生产构建一定包含文章**。你需要确认线上部署已经使用了包含这篇文章的最新提交。

可以检查：

- GitHub 仓库里文章文件是否已经提交并推送。
- Vercel/Netlify 的最新部署是否成功。
- 线上页面的更新时间是否符合预期。
- 部署平台使用的分支是否正确。

## 检查 robots.txt 有没有挡住爬虫

`robots.txt` 是搜索引擎爬虫访问网站时会先看的文件。它不能强制阻止所有访问，但主流搜索引擎通常会遵守里面的抓取规则。

打开：

```txt
https://example.com/robots.txt
```

正常情况下，个人博客通常会允许主要页面被抓取。需要特别注意下面这种配置：

```txt
User-agent: *
Disallow: /
```

这表示告诉所有爬虫不要抓取整个网站。开发阶段临时这么写可以理解，正式站点如果忘了改回来，搜索引擎就很难正常抓取内容。

还有一种更隐蔽：

```txt
User-agent: *
Disallow: /posts/
```

这会阻止文章路径被抓取。你的首页可能能被收录，但具体文章页迟迟不出现。

如果你只是不想让后台、接口或某些资源被抓，可以写得更精确，不要把文章路径一起挡掉。

## 检查 Sitemap 是否包含新文章

Sitemap 的作用是告诉搜索引擎：这个站点有哪些 URL 值得抓取。

Astro 通常会生成类似下面的地址：

```txt
https://example.com/sitemap.xml
https://example.com/sitemap-0.xml
```

先打开 `/sitemap.xml`。如果它只是一个索引文件，里面可能会引用 `/sitemap-0.xml`。继续打开具体的 sitemap 文件，然后搜索你的文章 URL。

Linux/macOS 可以用：

```bash
curl -L https://example.com/sitemap-0.xml | grep "my-post"
```

Windows PowerShell 可以用：

```powershell
(Invoke-WebRequest https://example.com/sitemap-0.xml).Content | Select-String "my-post"
```

如果搜不到新文章，说明搜索引擎可能还不知道这个 URL。继续检查：

- 文章是不是 `draft: true`。
- 文章 frontmatter 里的日期或格式是否异常。
- 构建流程是否成功生成了这篇文章。
- sitemap 插件是否正常运行。
- 部署平台是否部署了最新构建结果。

还要特别看 sitemap 里的域名是否正确。比如你正式站点是：

```txt
https://www.example.com/
```

但 sitemap 里生成的是：

```txt
http://localhost:4321/posts/my-post/
https://example.vercel.app/posts/my-post/
https://old-domain.com/posts/my-post/
```

这通常是 Astro 的 `site` 配置或 Mizuki 的 `siteURL` 配置不正确导致的。搜索引擎看到错误域名后，可能会把权重和索引信号分散到错误地址上。

如果你使用 Mizuki，可以重点检查 `src/config/siteConfig.ts` 里的 `siteURL` 是否是正式域名，并且建议以斜杠结尾：

```ts
siteURL: "https://www.example.com/",
```

## 检查 canonical 和 noindex

页面能打开、sitemap 也有，不代表搜索引擎一定会把当前 URL 当成正式页面。

先检查 canonical：

```bash
curl -L https://example.com/posts/my-post/ | grep -Ei "canonical|noindex"
```

PowerShell 可以用：

```powershell
(Invoke-WebRequest https://example.com/posts/my-post/).Content | Select-String "canonical|noindex"
```

你可能会看到类似：

```html
<link rel="canonical" href="https://www.example.com/posts/my-post/">
```

canonical 的意思是告诉搜索引擎：“这个页面的正式地址是这里。”

常见问题有：

- canonical 指向旧域名。
- canonical 指向 Vercel/Netlify 预览域名。
- canonical 使用 `http://`，但正式站点是 `https://`。
- canonical 指向首页或错误文章。
- 同一篇文章在多个路径下可访问，但 canonical 混乱。

如果 canonical 指错，搜索引擎可能会选择另一个 URL 作为规范页面，导致你搜索当前 URL 时看起来像“没收录”。

再检查有没有 `noindex`：

```html
<meta name="robots" content="noindex">
```

或者：

```html
<meta name="googlebot" content="noindex">
```

`noindex` 的意思很直接：告诉搜索引擎不要把这个页面编入索引。除非你明确不想让这篇文章出现在搜索结果里，否则正式文章页不应该带它。

## 检查构建产物和部署命令

很多静态博客的问题不在搜索引擎，而在构建阶段。

先本地构建：

```bash
pnpm build
```

如果构建失败，先解决构建错误。搜索引擎不会收录一个没有成功发布的页面。

构建成功后，检查 `dist` 里是否真的包含文章内容。PowerShell 可以这样查：

```powershell
Get-ChildItem -Recurse dist | Select-String "文章标题"
```

如果 `dist` 中没有文章标题，说明文章没有进入生产构建。常见原因包括：

- 文章是草稿：`draft: true`。
- 文章文件位置不符合内容集合要求。
- frontmatter 格式错误，导致内容解析失败。
- 内容同步脚本没有把文章拉到当前仓库。
- 部署平台没有运行正确的构建命令。

对于 Mizuki 这类项目，还要注意部署平台的命令是否和本地一致。例如：

```bash
pnpm install
pnpm build
```

如果你在 `package.json` 里依赖了 `prebuild` 同步内容，部署平台也必须具备对应的环境变量和仓库权限。否则本地有文章，线上构建时可能没有文章。

另外，Pagefind 只影响站内搜索。比如构建命令里有：

```bash
astro build && pagefind --site dist
```

这会生成站内搜索索引，但它不会直接决定 Google 或 Bing 是否收录你的文章。反过来也一样：Google 能搜到，不代表你网站自己的搜索框一定能搜到。

## 在搜索平台里看真实原因

排查到这里，如果页面、robots、sitemap、canonical 都没有明显问题，就应该去搜索平台看反馈。

### Google Search Console

在 Google Search Console 里使用“网址检查”，输入文章 URL。常见状态可以这样理解：

| 状态 | 可能原因 | 下一步 |
| --- | --- | --- |
| URL 不在 Google 上 | Google 还没发现，或发现后未收录 | 检查 sitemap，提交网址检查 |
| 已发现，尚未编入索引 | Google 知道这个 URL，但还没抓取或暂不处理 | 等待，确认 sitemap 和内链正常 |
| 已抓取，尚未编入索引 | Google 抓过页面，但暂时不收录 | 检查内容质量、重复度、页面价值 |
| 被 robots.txt 屏蔽 | robots 阻止抓取 | 修改 robots.txt |
| 被 noindex 排除 | 页面主动要求不收录 | 移除 noindex |
| Google 选择了其他规范网页 | canonical 或重复页面问题 | 检查 canonical 和重复 URL |

注意：在 Search Console 里请求编入索引，只是请求 Google 重新抓取或重新评估，不等于保证收录。

### Bing Webmaster Tools

Bing Webmaster Tools 里也可以检查 URL、提交 sitemap、查看抓取错误。

重点看：

- URL 是否能被 Bing 访问。
- sitemap 是否成功提交。
- 是否存在抓取错误。
- 是否被 robots.txt 阻止。
- 页面是否已经被发现。

如果你已经配置了 IndexNow，也可以结合 Bing 的 URL 检查结果判断：是“没有通知到”，还是“通知到了但暂时没有收录”。

更完整的 Bing 优化可以看我之前写的这篇：[必应搜索引擎优化完全指南](/posts/bing-seo-optimization-guide/)。

## IndexNow 推送成功但仍不收录怎么办

IndexNow 很有用，但它经常被误解。

它的作用是告诉搜索引擎：

```txt
这个 URL 更新了，你可以来抓取。
```

它不是告诉搜索引擎：

```txt
请立刻把这个 URL 放进搜索结果。
```

所以，即使 API 返回 `200` 或 `202`，也只能说明提交被收到或接受，不代表页面已经出现在搜索结果里。

如果你已经推送成功，但仍然搜不到，可以继续检查：

- URL 是否真实返回 `200`。
- IndexNow 密钥文件是否能访问。
- `host` 和 `urlList` 里的域名是否一致。
- sitemap 是否包含同一个正式 URL。
- 页面是否被 robots 或 noindex 排除。
- Bing Webmaster Tools 里 URL 检查是否有错误。

如果你还没有配置 IndexNow，可以参考这篇：[使用 IndexNow API 自动推送网站更新到搜索引擎](/posts/index_now/)。

## 常见问题速查表

| 症状 | 最可能原因 | 检查位置 | 修复方式 |
| --- | --- | --- | --- |
| 文章 URL 返回 404 | 文章没有进入生产构建，或部署不是最新版本 | 浏览器、`curl -I`、部署记录 | 重新构建部署，确认文章已提交 |
| sitemap 里没有文章 | 草稿、构建失败、内容同步失败 | `/sitemap.xml`、`/sitemap-0.xml` | 修复 frontmatter、构建流程或同步配置 |
| robots.txt 有 `Disallow: /` | 全站禁止爬虫抓取 | `/robots.txt` | 移除全站禁爬规则 |
| robots.txt 禁止 `/posts/` | 文章路径被屏蔽 | `/robots.txt` | 允许文章路径被抓取 |
| canonical 指向旧域名 | 站点 URL 配置错误 | 页面源码 | 修正 Astro `site` 或 Mizuki `siteURL` |
| 页面包含 noindex | 页面主动禁止索引 | 页面源码 | 移除 noindex 配置 |
| Search Console 显示“已发现，尚未编入索引” | Google 已知道 URL，但还没处理 | Google Search Console | 等待，增强内链，确认 sitemap 正常 |
| Search Console 显示“已抓取，尚未编入索引” | 页面被抓过，但质量或重复度不足 | Google Search Console | 改善内容原创性、标题、内部链接 |
| IndexNow 返回成功但 Bing 搜不到 | 推送不等于收录 | IndexNow 响应、Bing URL 检查 | 检查页面可抓取性，等待 Bing 处理 |
| 网站搜索框搜不到，但 Google 能搜到 | Pagefind 索引问题，不是搜索引擎问题 | `dist/pagefind`、构建命令 | 重新生成 Pagefind 索引 |

## 10 分钟排查清单

如果你只想快速定位问题，可以照这个顺序来：

- [ ] 直接打开文章 URL，确认不是 404。
- [ ] 用 `curl -I` 检查 HTTP 状态码。
- [ ] 确认线上部署是最新提交。
- [ ] 打开 `/robots.txt`，确认没有禁止全站或文章路径。
- [ ] 打开 `/sitemap.xml` 和 `/sitemap-0.xml`，确认包含文章 URL。
- [ ] 检查 sitemap 里的域名和协议是否是正式地址。
- [ ] 查看页面源码，确认 canonical 指向正确 URL。
- [ ] 搜索页面源码，确认没有 `noindex`。
- [ ] 本地运行 `pnpm build`，确认生产构建成功。
- [ ] 在 `dist` 中搜索文章标题，确认文章进入构建产物。
- [ ] 在 Google Search Console 里检查 URL 状态。
- [ ] 在 Bing Webmaster Tools 里检查 URL 和 sitemap 状态。
- [ ] 内容更新后再使用 IndexNow 推送。
- [ ] 如果搜索平台已经发现且技术项正常，给搜索引擎一些处理时间。

最后要记住：收录不是一个开关，而是一条链路。页面要先能生成、能访问、能被发现、能被抓取、没有主动禁止索引，然后才轮到内容质量和排名竞争。先把链路查通，再谈 SEO 优化，效率会高很多。

## 参考资料

- [Google Search Central：请求 Google 重新抓取 URL](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Google Search Central：Sitemap 说明](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Bing Webmaster Tools：URL Inspection](https://www.bing.com/webmasters/help/url-inspection-55a30305)
- [IndexNow 官方文档](https://www.indexnow.org/documentation)
- [IndexNow FAQ](https://www.indexnow.org/faq)
