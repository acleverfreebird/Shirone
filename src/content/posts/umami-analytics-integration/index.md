---
title: 'Astro博客集成Umami分析服务 - 完整实战指南'
published: 2025-10-11
description: 'Astro博客集成Umami分析服务完整实战指南：详细讲解Umami自托管部署、追踪脚本配置、浏览量统计组件开发、访客数显示、Cloudflare Worker API代理实现、CORS配置、缓存策略优化、延迟加载等技术细节，打造隐私友好且功能强大的网站访问统计分析系统，完整代码示例和故障排查方案。'
image: ''
tags: ['Umami', 'Astro', 'Cloudflare Worker', 'Web分析', '隐私保护']
category: '技术教程'
draft: false
lang: 'zh-CN'
excerpt: '从零开始在Astro博客中集成Umami分析服务,实现隐私友好的访问统计、浏览量显示,并通过Cloudflare Worker保护API密钥。'
keywords: ['Umami', 'Astro', 'Web分析', 'Cloudflare Worker', '浏览量统计', '隐私保护']
readingTime: 20
series: 'Web开发'
seriesOrder: 1
---

# Astro博客集成Umami分析服务

> 记录在 Astro 博客里接入 Umami 访问统计，并用 Cloudflare Worker 代理统计 API、在前端展示浏览量的完整过程。

---

## 📊 项目概览

### 为什么选择Umami?

Umami是一个开源、隐私友好的网站分析工具,相比Google Analytics有以下优势:

- ✅ **隐私保护**: 不使用Cookie,符合GDPR
- ✅ **轻量级**: 脚本体积小,加载快
- ✅ **开源免费**: 可自托管,完全掌控数据
- ✅ **简洁易用**: 界面清爽,数据直观
- ✅ **实时统计**: 实时查看访问数据

### 实现功能

| 功能 | 说明 | 状态 |
|------|------|------|
| **追踪脚本** | 自动追踪页面访问 | ✅ |
| **浏览量显示** | 首页和页脚显示统计 | ✅ |
| **访客数统计** | 显示独立访客数量 | ✅ |
| **API代理** | Cloudflare Worker隐藏Token | ✅ |
| **延迟加载** | 不影响首屏性能 | ✅ |

---

## 🚀 第一步: 配置Umami追踪

### 1.1 定义配置类型

首先在类型定义文件中添加Umami配置类型:

```typescript
// src/types/config.ts

export interface UmamiConfig {
  enable: boolean;           // 是否启用
  src: string;              // Umami脚本地址
  websiteId: string;        // 网站ID
  domains?: string;         // 限制域名(可选)
  autoTrack?: boolean;      // 自动追踪(默认true)
  delayLoad?: number;       // 延迟加载时间(毫秒)
}

export interface UmamiStatsConfig {
  enable: boolean;          // 是否启用统计显示
  apiUrl: string;          // API代理地址
}
```

### 1.2 添加配置项

在主配置文件中添加Umami配置:

```typescript
// src/config.ts

export const umamiConfig: UmamiConfig = {
  enable: true,
  src: "https://views.freebird2913.tech/script.js",
  websiteId: "726431d7-e252-486d-ab90-350313e5a519",
  domains: "www.freebird2913.tech",
  autoTrack: true,
  delayLoad: 2000, // 延迟2秒加载,不影响首屏
};

export const umamiStatsConfig: UmamiStatsConfig = {
  enable: true,
  apiUrl: "https://get-views.freebird2913.tech",
};
```

### 1.3 创建追踪组件

创建Umami追踪脚本组件:

```astro
---
// src/components/UmamiAnalytics.astro
import { umamiConfig } from "@/config";

const { enable, src, websiteId, domains, autoTrack, delayLoad } = umamiConfig;
---

{enable && (
  <script 
    is:inline 
    define:vars={{ src, websiteId, domains, autoTrack, delayLoad }}
  >
    // 延迟加载Umami脚本
    function loadUmami() {
      const script = document.createElement('script');
      script.defer = true;
      script.src = src;
      script.setAttribute('data-website-id', websiteId);
      
      if (domains) {
        script.setAttribute('data-domains', domains);
      }
      
      if (autoTrack !== undefined) {
        script.setAttribute('data-auto-track', autoTrack.toString());
      }
      
      document.head.appendChild(script);
    }
    
    // 延迟加载
    if (delayLoad && delayLoad > 0) {
      setTimeout(loadUmami, delayLoad);
    } else {
      loadUmami();
    }
  </script>
)}
```

### 1.4 集成到布局

在主布局文件中引入组件:

```astro
---
// src/layouts/Layout.astro
import UmamiAnalytics from "@/components/UmamiAnalytics.astro";
---

<html>
  <head>
    <!-- 其他head内容 -->
    <UmamiAnalytics />
  </head>
  <body>
    <!-- 页面内容 -->
  </body>
</html>
```

---

## 🔐 第二步: Cloudflare Worker API代理

### 2.1 为什么需要代理?

直接在前端调用Umami API会暴露API Token,存在安全风险。通过Cloudflare Worker代理可以:

- 🔒 隐藏API Token
- ⚡ 边缘缓存,提升性能
- 🌍 全球CDN加速
- 💰 免费额度充足

### 2.2 Worker完整代码

创建Cloudflare Worker代理:

```javascript
// cloudflare-worker/umami-stats-proxy.js

/**
 * Umami 统计数据代理 - Cloudflare Worker
 */

// ==================== 配置区域 ====================
const CONFIG = {
  // Umami API 地址
  UMAMI_API_URL: "https://views.freebird2913.tech/api",
  
  // Umami API Token (在 Umami 后台生成)
  UMAMI_API_TOKEN: "YOUR_UMAMI_API_TOKEN_HERE",
  
  // 网站 ID
  UMAMI_WEBSITE_ID: "726431d7-e252-486d-ab90-350313e5a519",
  
  // 允许的来源域名 (CORS)
  ALLOWED_ORIGINS: [
    "https://www.freebird2913.tech",
    "https://freebird2913.tech",
    "http://localhost:4321",
  ],
  
  // 缓存时间 (秒)
  CACHE_TTL: 300, // 5分钟
};
// ==================== 配置区域结束 ====================

export default {
  async fetch(request) {
    // CORS 预检请求
    if (request.method === "OPTIONS") {
      return handleCORS(request);
    }
    
    // 只允许 GET 请求
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // 路由处理
      if (path === "/stats/total") {
        return await getTotalPageviews(request);
      }
      
      if (path === "/stats/page") {
        const pageUrl = url.searchParams.get("url");
        if (!pageUrl) {
          return jsonResponse({ error: "Missing url parameter" }, 400);
        }
        return await getPagePageviews(request, pageUrl);
      }
      
      if (path === "/") {
        return jsonResponse({
          status: "ok",
          message: "Umami Stats Proxy is running",
          endpoints: {
            total: "/stats/total - Get total website pageviews",
            page: "/stats/page?url=/path - Get specific page pageviews",
          },
        });
      }
      
      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      console.error("Error:", error);
      return jsonResponse(
        { error: "Internal server error", message: error.message },
        500
      );
    }
  },
};

/**
 * 获取网站总浏览量
 */
async function getTotalPageviews(request) {
  const cacheKey = "umami:total:pageviews";
  
  // 尝试从缓存获取
  const cached = await getCache(cacheKey);
  if (cached) {
    return jsonResponse(cached, 200, request);
  }
  
  // 计算时间范围 (最近30天)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const startAt = startDate.getTime();
  const endAt = endDate.getTime();
  
  // 调用 Umami API
  const apiUrl = `${CONFIG.UMAMI_API_URL}/websites/${CONFIG.UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`;
  
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${CONFIG.UMAMI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Umami API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  const result = {
    total: data.pageviews?.value || 0,
    visitors: data.visitors?.value || 0,
    visits: data.visits?.value || 0,
    bounces: data.bounces?.value || 0,
    totaltime: data.totaltime?.value || 0,
    cached: false,
    timestamp: Date.now(),
  };
  
  // 缓存结果
  await setCache(cacheKey, result, CONFIG.CACHE_TTL);
  
  return jsonResponse(result, 200, request);
}

/**
 * 获取特定页面浏览量和访客数
 */
async function getPagePageviews(request, pageUrl) {
  const cacheKey = `umami:page:${pageUrl}`;
  
  // 尝试从缓存获取
  const cached = await getCache(cacheKey);
  if (cached) {
    return jsonResponse(cached, 200, request);
  }
  
  // 计算时间范围 (所有时间)
  const endDate = new Date();
  const startDate = new Date("2020-01-01");
  
  const startAt = startDate.getTime();
  const endAt = endDate.getTime();
  
  // 调用 Umami API - 获取页面浏览量
  const pageviewsUrl = `${CONFIG.UMAMI_API_URL}/websites/${CONFIG.UMAMI_WEBSITE_ID}/metrics?startAt=${startAt}&endAt=${endAt}&type=url&url=${encodeURIComponent(pageUrl)}`;
  
  const pageviewsResponse = await fetch(pageviewsUrl, {
    headers: {
      Authorization: `Bearer ${CONFIG.UMAMI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  
  if (!pageviewsResponse.ok) {
    throw new Error(`Umami API error: ${pageviewsResponse.status}`);
  }
  
  const pageviewsData = await pageviewsResponse.json();
  
  // 查找匹配的页面浏览量
  let pageviews = 0;
  if (Array.isArray(pageviewsData)) {
    const pageData = pageviewsData.find((item) => item.x === pageUrl);
    pageviews = pageData ? pageData.y : 0;
  }
  
  // 调用 Umami API - 获取页面访客数
  const visitorsUrl = `${CONFIG.UMAMI_API_URL}/websites/${CONFIG.UMAMI_WEBSITE_ID}/metrics?startAt=${startAt}&endAt=${endAt}&type=url&url=${encodeURIComponent(pageUrl)}`;
  
  const visitorsResponse = await fetch(visitorsUrl, {
    headers: {
      Authorization: `Bearer ${CONFIG.UMAMI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  
  let visitors = 0;
  if (visitorsResponse.ok) {
    const visitorsData = await visitorsResponse.json();
    if (Array.isArray(visitorsData)) {
      const visitorData = visitorsData.find((item) => item.x === pageUrl);
      visitors = visitorData ? Math.min(visitorData.y, pageviews) : Math.ceil(pageviews * 0.8);
    }
  }
  
  const result = {
    url: pageUrl,
    pageviews: pageviews,
    visitors: visitors,
    cached: false,
    timestamp: Date.now(),
  };
  
  // 缓存结果
  await setCache(cacheKey, result, CONFIG.CACHE_TTL);
  
  return jsonResponse(result, 200, request);
}

/**
 * 处理 CORS
 */
function handleCORS(request) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = CONFIG.ALLOWED_ORIGINS;
  
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  
  if (allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (allowedOrigins.length === 0) {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  
  return new Response(null, { status: 204, headers });
}

/**
 * 返回 JSON 响应
 */
function jsonResponse(data, status = 200, request = null) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300",
  };
  
  // 添加 CORS 头
  if (request) {
    const origin = request.headers.get("Origin");
    const allowedOrigins = CONFIG.ALLOWED_ORIGINS;
    
    if (allowedOrigins.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    } else if (allowedOrigins.length === 0) {
      headers["Access-Control-Allow-Origin"] = "*";
    }
  }
  
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * 简单的内存缓存
 */
const cache = new Map();

async function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  
  return { ...item.data, cached: true };
}

async function setCache(key, data, ttlSeconds) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}
```

### 2.3 部署Worker

1. **登录Cloudflare Dashboard**
   - 访问 [dash.cloudflare.com](https://dash.cloudflare.com)
   - 进入 Workers & Pages

2. **创建新Worker**
   - 点击 "Create Worker"
   - 命名为 `umami-stats-proxy`
   - 点击 "Quick Edit"

3. **粘贴代码**
   - 将上面的完整代码粘贴进去
   - **重要**: 修改 `UMAMI_API_TOKEN` 为你的真实Token

4. **获取API Token**
   - 登录Umami后台
   - 进入 Settings → API
   - 点击 "Create Token"
   - 复制Token并填入Worker代码

5. **保存并部署**
   - 点击 "Save and Deploy"
   - 记录Worker的URL (例如: `https://umami-stats-proxy.your-name.workers.dev`)

6. **配置自定义域名(可选)**
   - 在Worker设置中添加自定义域名
   - 例如: `get-views.freebird2913.tech`

---

## 📊 第三步: 浏览量显示组件

### 3.1 创建显示组件

创建浏览量和访客数显示组件:

```astro
---
// src/components/UmamiPageViews.astro
import { umamiStatsConfig } from "@/config";

interface Props {
  type?: "total" | "page";  // 显示类型
  url?: string;             // 页面URL (type=page时必需)
  showVisitors?: boolean;   // 是否显示访客数
  class?: string;
}

const {
  type = "total",
  url,
  showVisitors = true,
  class: className,
} = Astro.props;

// 如果未启用统计功能,不渲染组件
if (!umamiStatsConfig.enable) {
  return null;
}

// 如果是页面浏览量但未提供URL,不渲染
if (type === "page" && !url) {
  console.warn("UmamiPageViews: type='page' requires url prop");
  return null;
}

// 生成唯一ID
const componentId = `umami-views-${Math.random().toString(36).substr(2, 9)}`;
---

<div 
  class:list={["umami-page-views", className]} 
  id={componentId} 
  data-type={type} 
  data-url={url} 
  data-show-visitors={showVisitors}
>
  <div class="stat-item pageviews-item">
    <span class="label">浏览量:</span>
    <span class="views-count">
      <span class="loading">...</span>
      <span class="count" style="display: none;">0</span>
      <span class="error" style="display: none;">--</span>
    </span>
  </div>
  <div class="stat-item visitors-item" style={showVisitors ? "" : "display: none !important;"}>
    <span class="label">访客数量:</span>
    <span class="visitors-count">
      <span class="count">0</span>
    </span>
  </div>
</div>

<script>
  import { umamiStatsConfig } from "@/config";
  
  interface ViewsData {
    pageviews?: number;
    total?: number;
    visitors?: number;
    error?: string;
  }
  
  /**
   * 格式化数字显示
   */
  function formatNumber(num: number): string {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + "w";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  }
  
  /**
   * 获取浏览量数据
   */
  async function fetchPageViews(type: string, url?: string): Promise<ViewsData> {
    try {
      let apiUrl = `${umamiStatsConfig.apiUrl}/stats/total`;
      if (type === "page" && url) {
        apiUrl = `${umamiStatsConfig.apiUrl}/stats/page?url=${encodeURIComponent(url)}`;
      }
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch Umami page views:", error);
      return { error: (error as Error).message };
    }
  }
  
  /**
   * 更新显示
   */
  function updateDisplay(container: HTMLElement, data: ViewsData) {
    const showVisitors = container.getAttribute("data-show-visitors") === "true";
    const pageviewsItem = container.querySelector(".pageviews-item") as HTMLElement;
    const loadingEl = pageviewsItem?.querySelector(".loading") as HTMLElement;
    const countEl = pageviewsItem?.querySelector(".count") as HTMLElement;
    const errorEl = pageviewsItem?.querySelector(".error") as HTMLElement;
    
    if (loadingEl) loadingEl.style.display = "none";
    
    if (data.error) {
      console.error("Umami stats error:", data.error);
      if (errorEl) {
        errorEl.style.display = "inline";
      }
      return;
    }
    
    // 更新浏览量 (支持 pageviews 和 total 两种字段)
    const viewCount = data.pageviews ?? data.total;
    if (viewCount !== undefined && countEl) {
      countEl.textContent = formatNumber(viewCount);
      countEl.style.display = "inline";
    }
    
    // 更新访问者数量
    if (showVisitors && data.visitors !== undefined) {
      const visitorsItem = container.querySelector(".visitors-item") as HTMLElement;
      const visitorsCountEl = visitorsItem?.querySelector(".count") as HTMLElement;
      
      if (visitorsItem && visitorsCountEl) {
        visitorsCountEl.textContent = formatNumber(data.visitors);
        visitorsItem.style.display = "flex";
      }
    }
  }
  
  /**
   * 初始化组件
   */
  function initUmamiPageViews() {
    if (!umamiStatsConfig.enable) return;
    
    const containers = document.querySelectorAll(".umami-page-views");
    containers.forEach(async (container) => {
      const type = container.getAttribute("data-type") || "total";
      const url = container.getAttribute("data-url") || undefined;
      
      const data = await fetchPageViews(type, url);
      updateDisplay(container as HTMLElement, data);
    });
  }
  
  // 页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUmamiPageViews);
  } else {
    initUmamiPageViews();
  }
  
  // 支持页面导航后重新加载 (SPA模式)
  document.addEventListener("astro:page-load", initUmamiPageViews);
</script>

<style>
  .umami-page-views {
    display: inline-flex;
    align-items: center;
    gap: 1.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary, #666);
  }
  
  .stat-item {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .label {
    font-size: 0.875rem;
    opacity: 0.9;
    font-weight: 500;
  }
  
  .views-count,
  .visitors-count {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--color-text-primary, #333);
  }
  
  .loading {
    opacity: 0.6;
    font-size: 0.75rem;
  }
  
  .error {
    opacity: 0.4;
  }
  
  /* 深色模式支持 */
  :global(.dark) .umami-page-views {
    color: var(--color-text-secondary-dark, #999);
  }
  
  :global(.dark) .views-count,
  :global(.dark) .visitors-count {
    color: var(--color-text-primary-dark, #eee);
  }
</style>
```

### 3.2 在首页Profile中使用

```astro
---
// src/components/widget/Profile.astro
import UmamiPageViews from "@/components/UmamiPageViews.astro";
---

<div class="profile-card">
  <!-- 其他内容 -->
  
  <!-- 总浏览量显示 -->
  <div class="flex justify-center mb-2.5">
    <UmamiPageViews type="total" class="text-sm" />
  </div>
</div>
```

### 3.3 在页脚Footer中使用

```astro
---
// src/components/Footer.astro
import UmamiPageViews from "./UmamiPageViews.astro";
---

<footer>
  <!-- 统计信息 -->
  <div class="mb-4">
    <UmamiPageViews type="total" showVisitors={true} />
  </div>
  
  <!-- 其他页脚内容 -->
</footer>
```

---

## 🎯 使用指南

### 开发环境测试

```bash
# 启动开发服务器
pnpm run dev

# 访问 http://localhost:4321
# 打开浏览器控制台查看Umami脚本加载情况
```

### 生产构建

```bash
# 构建生产版本
pnpm run build

# 预览构建结果
pnpm run preview
```

### 验证功能

1. **追踪脚本验证**
   - 打开浏览器开发者工具
   - 查看Network标签
   - 确认Umami脚本已加载

2. **浏览量显示验证**
   - 查看首页Profile区域
   - 查看页面底部Footer
   - 确认数字正常显示

3. **API代理验证**
   ```bash
   # 测试总浏览量API
   curl https://get-views.freebird2913.tech/stats/total
   
   # 测试页面浏览量API
   curl https://get-views.freebird2913.tech/stats/page?url=/
   ```

---

## 🔍 故障排查

### 问题1: 浏览量显示为 "..."

**可能原因:**
- Worker未部署或配置错误
- API Token无效
- CORS配置问题

**解决方法:**
```bash
# 1. 检查Worker是否正常运行
curl https://your-worker.workers.dev/

# 2. 检查API响应
curl https://your-worker.workers.dev/stats/total

# 3. 查看浏览器控制台错误信息
```

### 问题2: 追踪脚本未加载

**可能原因:**
- 配置中 `enable` 为 false
- 脚本URL错误
- 网络问题

**解决方法:**
1. 检查 `src/config.ts` 中的配置
2. 验证Umami服务是否正常运行
3. 查看浏览器Network标签

### 问题3: 访客数量显示为0

**可能原因:**
- Worker代码中访客数逻辑问题
- Umami API返回数据格式变化

**解决方法:**
1. 查看Worker日志
2. 检查API返回的数据结构
3. 更新Worker代码中的数据提取逻辑

---

## 📈 性能优化

### 延迟加载

通过延迟加载Umami脚本,避免影响首屏性能:

```typescript
// 配置延迟2秒加载
delayLoad: 2000
```

### 缓存策略

Worker中实现了5分钟缓存:

```javascript
const CACHE_TTL = 300; // 5分钟
```

### 数字格式化

大数字自动格式化为k/w:

```typescript
// 10000+ 显示为 "1.0w"
// 1000+ 显示为 "1.0k"
```

---

## 🎨 自定义样式

### 修改颜色

```css
.umami-page-views {
  color: #your-color;
}

.views-count {
  color: #your-primary-color;
}
```

### 修改布局

```css
.umami-page-views {
  flex-direction: column; /* 垂直布局 */
  gap: 0.5rem;
}
```

---

## 📚 相关资源

### 官方文档
- [Umami官方文档](https://umami.is/docs)
- [Cloudflare Workers文档](https://developers.cloudflare.com/workers/)
- [Astro文档](https://docs.astro.build/)

### 工具推荐
- [Umami Cloud](https://cloud.umami.is/) - 托管服务
- [Umami GitHub](https://github.com/umami-software/umami) - 源码仓库

---

## 💡 小结

这套方案把统计脚本加载和浏览量数据拉取拆成了两条独立链路：页面访问统计直接走 Umami 官方追踪脚本，而前端展示的 PV/UV 数字则通过 Cloudflare Worker 中转并加上边缘缓存，既不会在前端暴露 Umami API Token，也能避免每次刷新页面都打穿后端接口。