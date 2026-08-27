---
title: '手把手教你用Python构建一个MCP天气服务器：从零基础到SSE与Streamable HTTP实战'
published: 2026-03-25
description: '手把手教你用Python构建一个MCP天气服务器：从零基础到SSE与Streamable HTTP实战'
image: ''
tags: ['MCP', 'Python', 'FastMCP', 'AI', '实战']
category: 'AI'
draft: false
lang: 'zh-CN'
excerpt: '听说MCP是2026年最火的AI协议？今天带你用Python写一个真正的MCP天气服务器，顺便把和风天气API揉进去——代码不超过100行，两种传输协议随便切。看完你也能跟别人吹牛说自己搞过MCP了。'
keywords: ['MCP', 'Model Context Protocol', 'FastMCP', 'Python', '天气API', 'SSE', 'Streamable HTTP', 'AI协议']
readingTime: 8
series: 'MCP开发实战'
seriesOrder: 1
---

> 听说MCP是2026年最火的AI协议？别慌，今天带你用Python写一个真正的MCP服务器，顺便把和风天气API揉进去——代码不超过100行，两种传输协议随便切。看完你也能跟别人吹牛说自己搞过MCP了。

---

## 目录

- [MCP到底是个啥玩意儿？](#mcp到底是个啥玩意儿)
- [准备工作：十分钟搞定环境](#准备工作十分钟搞定环境)
- [Step 1：搭建最基础的FastMCP骨架](#step-1搭建最基础的fastmcp骨架)
- [Step 2：接入和风天气API](#step-2接入和风天气api)
- [Step 3：给MCP加点料——完整代码](#step-3给mcp加点料完整代码)
- [Step 4：传输协议的切换——SSE vs Streamable HTTP](#step-4传输协议的切换sse-vs-streamable-http)
- [测试与调试](#测试与调试)
- [写在最后](#写在最后)

---

## MCP到底是个啥玩意儿？

如果你还在为每个AI模型写单独的API适配代码而头秃，那么Model Context Protocol（MCP）就是你想要的解药。简单来说，MCP就是AI世界的“USB-C接口”——一个统一的标准，让大语言模型（LLM）能够以一致的方式调用外部工具、读取数据资源，而不用管底层用的是什么模型、什么框架。

MCP的核心设计借鉴了经典的客户端-服务器架构，通过标准化的JSON-RPC 2.0消息格式实现双向通信。你可以把它想象成AI的“万能插座”：AI应用（Host）通过MCP服务器（Server）连接各种能力（Tools、Resources、Prompts），就像用同一个USB-C线插不同的设备。

对于一个MCP服务器来说，它主要包含三个核心组件：

- **Tools（工具）** ：AI模型可以直接调用的函数，比如“获取当前天气”、“发送邮件”。这是最常用的组件，也是我们今天的重点。
- **Resources（资源）** ：可被读取的结构化数据，比如配置文件、数据库记录。
- **Prompts（提示词）** ：预定义的提示模板，帮助AI更好地理解用户意图。

---

## 准备工作：十分钟搞定环境

咱们走最快、最稳的路线。不搞花里胡哨，直接开干。

### Python环境

首先，确保你的Python版本在3.10以上。打开终端验证一下：

```bash
python --version
```

如果版本过低，去Python官网下载安装，**安装时记得勾选“Add Python to PATH”** 。别问为什么，问就是血的教训。

### 安装MCP SDK

这里推荐使用官方力推的`uv`工具，比传统的pip快得多，项目管理也更规范：

```bash
# 安装uv（Windows用PowerShell，Mac/Linux用Terminal）
pip install uv

# 验证安装
uv --version
```

然后创建一个项目目录并初始化：

```bash
mkdir weather-mcp-server
cd weather-mcp-server
uv init
```

接着添加依赖：

```bash
uv add "mcp[cli]"
uv add requests python-dotenv
```

依赖装好之后，项目结构大概长这样：

```
weather-mcp-server/
├── .venv/          # 虚拟环境（自动生成）
├── main.py         # 入口文件
├── pyproject.toml  # 项目配置
└── README.md       # 项目说明
```

顺便提一句，`uv`自动创建的`pyproject.toml`文件会帮你管理所有依赖，比手动维护`requirements.txt`不知道高到哪里去了。

### 获取和风天气API Key

接下来去[和风天气开发者控制台](https://console.qweather.com)注册一个账号。注册完成后创建一个免费订阅的项目，你会得到一个API Key（也叫API KEY），这是访问天气数据的“钥匙”。

免费版每天有1000次查询额度，个人开发完全够用。拿到Key之后，在项目根目录创建一个`.env`文件，把Key存进去：

```bash
# .env
QWEATHER_API_KEY=你的API_KEY
```

**友情提示：千万不要把API Key硬编码在代码里，更不要传到GitHub上——别问我怎么知道的。**

---

## Step 1：搭建最基础的FastMCP骨架

现在我们开始写代码。在项目目录下创建`server.py`文件：

```python
# server.py
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv
import os
import requests
import json

# 加载环境变量
load_dotenv()

# 创建MCP服务器实例，名字叫"WeatherServer"
mcp = FastMCP("WeatherServer")

if __name__ == "__main__":
    # 使用STDIO协议运行服务器
    mcp.run(transport='stdio')
```

就这几行代码，一个最简单的MCP服务器已经跑起来了。`FastMCP`是官方SDK提供的高级封装，把协议层那些烦人的细节都藏起来了，你只需要关心业务逻辑。

---

## Step 2：接入和风天气API

接下来才是重头戏——把真正的天气数据塞进来。

和风天气的实时天气API接口地址是：`https://devapi.qweather.com/v7/weather/now`

我们需要实现一个城市名称到LocationID的转换功能（因为和风天气的API需要LocationID而不是城市名）。这里先用一个简化的方法：用城市名直接查询和风天气的城市搜索API。

在`server.py`中添加以下函数：

```python
def get_location_id(city_name: str) -> str:
    """
    根据城市名称获取和风天气的LocationID
    """
    url = "https://geoapi.qweather.com/v2/city/lookup"
    params = {
        "location": city_name,
        "key": os.getenv("QWEATHER_API_KEY")
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get("code") == "200" and data.get("location"):
            return data["location"][0]["id"]
        else:
            return None
    except Exception as e:
        print(f"查询城市ID失败: {e}")
        return None


def fetch_weather(location_id: str) -> dict:
    """
    根据LocationID获取实时天气数据
    """
    url = "https://devapi.qweather.com/v7/weather/now"
    params = {
        "location": location_id,
        "key": os.getenv("QWEATHER_API_KEY")
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get("code") == "200":
            return data.get("now", {})
        else:
            return {"error": f"API返回错误码: {data.get('code')}"}
    except Exception as e:
        return {"error": f"请求失败: {e}"}
```

---

## Step 3：给MCP加点料——完整代码

现在是见证奇迹的时刻。用`@mcp.tool()`装饰器把天气查询函数暴露成AI可以调用的Tool：

```python
# server.py 完整代码
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv
import os
import requests
import json

load_dotenv()

# 创建MCP服务器实例
mcp = FastMCP("WeatherServer")


def get_location_id(city_name: str) -> str:
    """根据城市名称获取和风天气的LocationID"""
    url = "https://geoapi.qweather.com/v2/city/lookup"
    params = {
        "location": city_name,
        "key": os.getenv("QWEATHER_API_KEY")
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get("code") == "200" and data.get("location"):
            return data["location"][0]["id"]
        return None
    except Exception as e:
        print(f"查询城市ID失败: {e}")
        return None


def fetch_weather(location_id: str) -> dict:
    """根据LocationID获取实时天气数据"""
    url = "https://devapi.qweather.com/v7/weather/now"
    params = {
        "location": location_id,
        "key": os.getenv("QWEATHER_API_KEY")
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get("code") == "200":
            return data.get("now", {})
        return {"error": f"API返回错误码: {data.get('code')}"}
    except Exception as e:
        return {"error": f"请求失败: {e}"}


@mcp.tool()
def get_current_weather(city_name: str) -> str:
    """
    获取指定城市的当前天气信息
    
    Args:
        city_name: 城市名称，例如"北京"、"上海"、"广州"
    
    Returns:
        包含温度、湿度、天气状况等信息的字符串
    """
    # 获取LocationID
    location_id = get_location_id(city_name)
    if not location_id:
        return f"抱歉，没有找到城市「{city_name}」的天气信息，请检查城市名称是否正确。"
    
    # 获取天气数据
    weather_data = fetch_weather(location_id)
    
    if "error" in weather_data:
        return weather_data["error"]
    
    # 格式化返回结果
    result = f"""
📍 城市：{city_name}
🌡️ 温度：{weather_data.get('temp', 'N/A')}°C
💧 湿度：{weather_data.get('humidity', 'N/A')}%
☁️ 天气：{weather_data.get('text', 'N/A')}
💨 风向：{weather_data.get('windDir', 'N/A')}
🌀 风力等级：{weather_data.get('windScale', 'N/A')}级
👁️ 能见度：{weather_data.get('vis', 'N/A')} km
    """
    return result.strip()


@mcp.tool()
def get_weather_by_location(latitude: float, longitude: float) -> str:
    """
    根据经纬度获取当前天气信息
    
    Args:
        latitude: 纬度，例如 39.9042
        longitude: 经度，例如 116.4074
    
    Returns:
        包含温度、湿度、天气状况等信息的字符串
    """
    # 构建经纬度格式
    location = f"{longitude},{latitude}"
    
    url = "https://devapi.qweather.com/v7/weather/now"
    params = {
        "location": location,
        "key": os.getenv("QWEATHER_API_KEY")
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get("code") != "200":
            return f"获取天气信息失败，错误码: {data.get('code')}"
        
        now = data.get("now", {})
        result = f"""
📍 位置：{latitude}, {longitude}
🌡️ 温度：{now.get('temp', 'N/A')}°C
💧 湿度：{now.get('humidity', 'N/A')}%
☁️ 天气：{now.get('text', 'N/A')}
💨 风向：{now.get('windDir', 'N/A')}
🌀 风力等级：{now.get('windScale', 'N/A')}级
👁️ 能见度：{now.get('vis', 'N/A')} km
        """
        return result.strip()
    except Exception as e:
        return f"请求失败: {e}"


if __name__ == "__main__":
    # 使用STDIO协议运行服务器（本地调试用）
    mcp.run(transport='stdio')
```

代码量不到120行，但已经是一个功能完整的MCP天气服务器了。两个Tool分别支持通过**城市名**和**经纬度**查询天气，AI模型可以像调用本地函数一样调用它们。

---

## Step 4：传输协议的切换——SSE vs Streamable HTTP

前面我们用的是`transport='stdio'`（标准输入输出），适合本地调试，但MCP真正的威力在于支持多种传输协议。下面详细展开SSE和Streamable HTTP两种模式的切换方法。

### 为什么要关心传输协议？

MCP客户端和服务器之间的通信方式有几种选择，各有各的适用场景：

| 传输协议 | 适用场景 | 特点 |
|---------|---------|------|
| **stdio** | 本地开发、命令行工具 | 最简单，客户端启动服务器子进程，1对1通信 |
| **SSE** | 服务器独立运行、多客户端连接 | 基于HTTP的服务器推送，但**仅单向通信** |
| **Streamable HTTP** | 远程部署、云原生、企业级应用 | 双向流式通信，支持断点续传，现代架构首选 |

MCP的SSE模式允许服务器作为一个独立运行的进程，支持多个客户端的灵活连接和断开，解决了stdio模式下“一个客户端绑定一个服务器进程”的强耦合问题。在SSE模式下，客户端通过EventSource对象与服务器建立持久连接，服务器通过该连接持续推送数据。

而**Streamable HTTP**是MCP协议在2025年3月推出的重要新特性，它是对SSE的一次重大升级。Streamable HTTP基于HTTP协议实现了真正的双向流式数据传输——传统HTTP就像是一次性送水的“桶装水服务”，每次只能送一整桶；Streamable HTTP则像是“自来水管道”，可以持续不断地输送数据，而且可以双向流动。

### SSE模式的实现

把stdio切换成SSE，只需要修改`mcp.run()`的transport参数：

```python
if __name__ == "__main__":
    # SSE模式：服务器独立运行，支持多客户端连接
    mcp.run(transport='sse', host='0.0.0.0', port=8000)
```

启动后，服务器会暴露两个核心端点：

- `GET /sse`：SSE连接端点，用于建立持久连接
- `POST /message`：接收JSON-RPC消息的端点

### Streamable HTTP模式的实现

Streamable HTTP模式的切换更简单：

```python
if __name__ == "__main__":
    # Streamable HTTP模式：现代HTTP流式传输
    mcp.run(transport='streamable-http', host='0.0.0.0', port=8000, path='/mcp')
```

Streamable HTTP与SSE相比有几个关键优势：

| 特性 | SSE | Streamable HTTP |
|------|-----|-----------------|
| 通信方向 | 仅服务器→客户端 | **双向通信** |
| 断点续传 | ❌ | ✅ |
| 无状态设计 | ❌ | ✅，适合Serverless部署 |
| 防火墙/代理兼容性 | 长连接可能被终止 | **完美兼容** |
| 企业级部署 | 有限 | 原生支持 |

Streamable HTTP在MCP中的核心价值在于：**单一端点 + 动态升级机制**。客户端通过HTTP POST请求发送JSON-RPC格式的消息，服务器可以根据需要返回单一JSON响应，也可以启动SSE流实现持续交互。这种设计特别适合需要持续交换上下文或进行多轮对话的大模型应用场景。

### 统一切换的便捷设计

为了方便开发调试，可以在启动时通过命令行参数动态选择传输协议：

```python
# server.py 末尾添加
if __name__ == "__main__":
    import sys
    
    # 默认使用stdio
    transport = sys.argv[1] if len(sys.argv) > 1 else "stdio"
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    
    if transport == "sse":
        print(f"🚀 启动SSE模式服务器，端口: {port}")
        mcp.run(transport='sse', host='0.0.0.0', port=port)
    elif transport == "streamable-http":
        print(f"🚀 启动Streamable HTTP模式服务器，端口: {port}")
        mcp.run(transport='streamable-http', host='0.0.0.0', port=port, path='/mcp')
    else:
        print("🚀 启动STDIO模式服务器（本地调试）")
        mcp.run(transport='stdio')
```

使用时：

```bash
# stdio模式（默认）
python server.py

# SSE模式
python server.py sse 8000

# Streamable HTTP模式
python server.py streamable-http 8000
```

### 传输协议选型建议

根据不同的部署场景，我建议这样选择：

- **本地开发/调试**：用`stdio`，最简单，直接跑就行
- **内网部署、多客户端访问**：用`SSE`，解耦客户端和服务器，支持多个客户端同时连接
- **云原生部署、Serverless、生产环境**：用`Streamable HTTP`，这是目前MCP官方推荐的企业级部署方式，支持负载均衡、断点续传和无状态设计

---

## 测试与调试

### 使用MCP Inspector调试

MCP官方提供了一个非常好用的调试工具叫`Inspector`。安装方式很简单：

```bash
uv add "mcp[cli]"
```

然后用命令行启动调试：

```bash
# 测试stdio模式
mcp dev server.py

# 测试SSE模式
mcp dev server.py --transport sse --port 8000

# 测试Streamable HTTP模式
mcp dev server.py --transport streamable-http --port 8000
```

Inspector会打开一个Web界面，你可以直接在里面调用`get_current_weather`工具，看看返回的数据对不对。

### 通过HTTP客户端测试（Streamable HTTP模式）

如果你启动了Streamable HTTP模式的服务器（端口8000，路径`/mcp`），可以用`curl`快速测试：

```bash
# 发送初始化请求
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {}
    },
    "id": 1
  }'
```

---

## 写在最后

100多行代码，我们从零搭建了一个功能完整的MCP天气服务器。回顾一下我们都做了什么：

1. **了解了MCP是什么**：AI世界的“USB-C接口”，统一模型与外部工具的通信标准
2. **搭建了开发环境**：Python 3.10+、uv包管理工具、和风天气API Key
3. **编写了MCP服务器**：用`FastMCP`框架，不到120行代码实现了两个天气查询工具
4. **掌握了传输协议切换**：stdio → SSE → Streamable HTTP，三种模式任你切换

这个天气服务器可以直接被任何支持MCP协议的AI客户端使用，比如Cursor、Claude Desktop、Cherry Studio等。当你在这些工具里输入“北京今天天气怎么样”，AI模型就会自动调用我们写的`get_current_weather`工具，返回真实的天气数据。

如果你想继续深入，还可以往这个服务器里添加更多功能：

- **7天天气预报**：和风天气有`/v7/weather/7d`接口
- **天气预警信息**：`/v7/warning/now`接口
- **日出日落时间**：用`/v7/astronomy/sun`接口
- **空气质量**：`/v7/air/now`接口

每次添加新功能只需要再写一个用`@mcp.tool()`装饰的函数，剩下的MCP协议层的事情，`FastMCP`全帮你搞定了。

---

## 📚 参考链接

- [和风天气开发服务](https://dev.qweather.com/)：API文档和注册入口
- [MCP官方文档](https://modelcontextprotocol.io/)：协议规范和最佳实践
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)：官方Python实现
- [MCP Inspector使用指南](https://modelcontextprotocol.io/docs/tools/inspector)：调试工具的使用方法

---

**💡 小贴士**：如果你想把这个服务器部署到云端，记得把`.env`里的API Key换成环境变量，`transport`选`streamable-http`模式，配合反向代理（Nginx/Caddy）和负载均衡，直接就是企业级的生产配置。
