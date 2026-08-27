---
title: "使用 IndexNow API 自动推送网站更新到搜索引擎"
published: 2026-02-21
description: "详解如何使用 Python 脚本配合 IndexNow API 自动推送网站更新到 Bing 等搜索引擎，包括密钥申请、站点地图解析、批量推送等完整实现流程。"
tags: ["SEO", "IndexNow", "Python", "Bing", "搜索引擎优化"]
category: "技术教程"
draft: false
lang: "zh-CN"
---

对于运营网站的朋友来说，最头疼的事情之一就是：辛辛苦苦写了一篇新文章，搜索引擎却迟迟不来收录。**IndexNow** 正是为了解决这个问题而生——它让你可以主动告诉搜索引擎"我的网站有更新了，快来抓取吧"。

本文将详细介绍如何使用 Python 脚本实现全自动的 IndexNow 推送，让你的新内容能被搜索引擎快速发现并收录。

## 什么是 IndexNow

**IndexNow** 是一项开放的协议，允许网站所有者通过简单的 API 调用，即时通知搜索引擎网站内容的变更。目前支持 IndexNow 的主要搜索引擎包括：

- **Bing**（微软必应）
- **Yandex**（俄罗斯搜索引擎）
- **Seznam.cz**（捷克搜索引擎）

### IndexNow 的核心优势

相比传统的等待搜索引擎爬虫被动发现，IndexNow 带来了显著的优势：

| 特性 | 传统方式 | IndexNow |
|------|----------|----------|
| 收录速度 | 数天至数周 | 几分钟到几小时 |
| 主动性 | 被动等待 | 主动通知 |
| 资源消耗 | 频繁爬取 | 按需抓取 |
| 配置难度 | 简单 | 中等 |

**实际效果**：在本站启用 IndexNow 后，新发布的文章通常在 10-30 分钟内就能在 Bing 搜索中被检索到，收录速度提升了数十倍。

## 前置准备工作

在开始编写推送脚本之前，你需要完成以下准备工作：

### 1. 申请 IndexNow API 密钥

访问 [Bing 网站管理员工具](https://www.bing.com/webmasters) 或 [IndexNow 官网](https://www.indexnow.org/) 生成你的专属 API 密钥。

密钥生成后，需要将其放置在网站根目录下：

1. 创建一个文本文件，文件名就是密钥本身（例如：`5474f3826c5b4b9ea03c15dcee108f7c.txt`）
2. 文件内容也填写相同的密钥
3. 上传到网站的根目录，确保可以通过 `https://你的域名/密钥.txt` 访问

> **验证方法**：在浏览器中访问 `https://your-domain.com/your-key.txt`，应该能看到纯文本的密钥内容。

### 2. 确认站点地图可访问

确保你的网站已经生成了标准的 XML 格式站点地图（sitemap），并且可以通过 URL 直接访问，例如：

```
https://www.yourdomain.com/sitemap-0.xml
https://www.yourdomain.com/sitemap.xml
```

## 编写推送脚本

下面是一个完整的 Python 脚本，它会自动抓取你的站点地图，并将所有 URL 逐个推送到 IndexNow。

### 完整代码实现

```python
import requests
import xml.etree.ElementTree as ET
import json
import time

# --- 配置区域 ---
# 你的站点地图 URL
SITEMAP_URL = "https://www.yourdomain.com/sitemap-0.xml"

# 你的 IndexNow API 密钥
INDEXNOW_API_KEY = "your_api_key_here"

# 你的网站域名
HOST = "www.yourdomain.com"

# IndexNow API 端点
INDEXNOW_API_URL = "https://api.indexnow.org/indexnow"


def fetch_and_parse_sitemap():
    """获取并解析站点地图，提取所有 URL。"""
    print(f"正在获取站点地图: {SITEMAP_URL}")
    
    try:
        response = requests.get(SITEMAP_URL, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"获取站点地图失败: {e}")
        return []

    print("站点地图获取成功，正在解析 URL...")
    
    try:
        # 注册 XML 命名空间
        namespaces = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        root = ET.fromstring(response.content)
        
        # 提取所有 <loc> 标签中的 URL
        urls = [elem.text for elem in root.findall('sm:url/sm:loc', namespaces)]
        return urls
    except ET.ParseError as e:
        print(f"解析 XML 时出错: {e}")
        return []


def submit_to_indexnow(url_list):
    """将 URL 列表提交到 IndexNow API。"""
    if not url_list:
        print("没有需要提交的 URL。")
        return

    key_location = f"https://{HOST}/{INDEXNOW_API_KEY}.txt"

    payload = {
        "host": HOST,
        "key": INDEXNOW_API_KEY,
        "keyLocation": key_location,
        "urlList": url_list
    }

    headers = {
        'Content-Type': 'application/json; charset=utf-8'
    }

    print(f"正在提交: {url_list[0]}")
    
    try:
        response = requests.post(
            INDEXNOW_API_URL,
            headers=headers,
            data=json.dumps(payload),
            timeout=10
        )
        
        # IndexNow 返回 200 或 202 都表示成功
        if response.status_code in [200, 202]:
            print(f"✅ 提交成功 (状态码: {response.status_code})")
        else:
            print(f"❌ 提交失败 (状态码: {response.status_code})")
            print(f"响应内容: {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"请求异常: {e}")


if __name__ == "__main__":
    urls_to_submit = fetch_and_parse_sitemap()
    
    if urls_to_submit:
        print(f"\n共发现 {len(urls_to_submit)} 个 URL，开始推送...\n")
        
        for i, url in enumerate(urls_to_submit, 1):
            print(f"[{i}/{len(urls_to_submit)}] ", end="")
            submit_to_indexnow([url])
            # 添加延迟，避免请求过于频繁
            time.sleep(0.5)
        
        print("\n✨ 所有 URL 推送完成！")
    else:
        print("未能从站点地图中获取任何 URL。")
```

### 代码关键解析

**站点地图解析**：
```python
namespaces = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls = [elem.text for elem in root.findall('sm:url/sm:loc', namespaces)]
```
站点地图使用 XML 命名空间，需要正确注册才能解析到 URL。

**API 请求结构**：
```python
payload = {
    "host": HOST,
    "key": INDEXNOW_API_KEY,
    "keyLocation": key_location,
    "urlList": url_list
}
```
IndexNow 要求同时提供密钥和密钥文件的访问地址，用于验证你对网站的所有权。

## 使用步骤

### 第一步：安装依赖

确保你的环境中已安装 `requests` 库：

```bash
pip install requests
```

### 第二步：修改配置

打开脚本，修改以下三个配置项：

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `SITEMAP_URL` | 你的站点地图完整 URL | `https://example.com/sitemap.xml` |
| `INDEXNOW_API_KEY` | 从 Bing 获取的 API 密钥 | `a1b2c3d4e5f6...` |
| `HOST` | 你的域名（不含协议） | `www.example.com` |

### 第三步：运行脚本

```bash
python indexnow_pusher.py
```

运行后你会看到类似这样的输出：

```
正在获取站点地图: https://www.example.com/sitemap-0.xml
站点地图获取成功，正在解析 URL...

共发现 25 个 URL，开始推送...

[1/25] 正在提交: https://www.example.com/post-1
✅ 提交成功 (状态码: 200)
[2/25] 正在提交: https://www.example.com/post-2
✅ 提交成功 (状态码: 200)
...
✨ 所有 URL 推送完成！
```

## 进阶：集成到 CI/CD 流程

如果你使用 GitHub Actions 或类似的 CI/CD 工具，可以在每次部署后自动执行推送脚本。以下是一个 GitHub Actions 工作流示例：

```yaml
name: Push to IndexNow

on:
  push:
    branches: [main]

jobs:
  indexnow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install requests
      
      - name: Push to IndexNow
        run: python scripts/indexnow_pusher.py
```

这样，每次你推送代码到主分支时，站点地图中的 URL 都会自动推送给搜索引擎。

## 常见问题

### Q: 为什么推送成功了，但文章还是没有被收录？

IndexNow 只是通知搜索引擎"这里有新内容"，但具体何时抓取和收录仍由搜索引擎决定。通常几分钟到几小时内会看到效果，如果内容质量不佳，也可能不被收录。

### Q: 每次推送有数量限制吗？

IndexNow 官方建议单次推送不超过 10,000 个 URL。对于普通博客站点，通常不会有这个问题。

### Q: 可以频繁推送吗？

虽然技术上可以，但建议只在有实质性内容更新时推送。过于频繁的无效推送可能导致 API 被限制。

### Q: 密钥文件必须放在根目录吗？

是的，IndexNow 协议要求密钥文件必须放在域名根目录，以便搜索引擎验证网站所有权。

### Q: Google 支持 IndexNow 吗？

目前 Google 尚未正式支持 IndexNow 协议。对于 Google，建议同时使用传统的 Sitemap 提交方式。

## 总结

通过本文，你已经学会了：

1. **了解 IndexNow 的工作原理** —— 主动通知搜索引擎内容更新的开放协议
2. **申请和配置 API 密钥** —— 完成网站所有权验证
3. **编写 Python 推送脚本** —— 自动化站点地图解析和 URL 推送
4. **集成到部署流程** —— 实现全自动化的 SEO 优化

IndexNow 是提升网站 SEO 效果的有力工具，特别适合内容更新频繁的博客和资讯类网站。将它集成到你的发布流程中，可以显著缩短新内容的收录时间，让更多读者通过搜索引擎发现你的优质内容。

---

> *如果你在配置过程中遇到问题，或者有任何 SEO 优化的心得，欢迎在评论区留言交流。如果觉得本文有帮助，别忘了分享给需要的朋友！*
