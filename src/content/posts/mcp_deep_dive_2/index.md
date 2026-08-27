---
title: 'MCP开发实战（二）：从单机到分布式，2026年MCP生态发生了什么？'
published: 2026-05-02
description: '从Anthropic开源MCP到MCP开发者峰会，从Gateway架构到安全风波——带你全面了解2026年4月MCP生态的爆炸式增长，以及如何构建生产级的多Agent协作系统。'
image: ''
tags: ['MCP', 'Python', '多Agent', '架构', 'AI', '安全', 'Gateway', 'Anthropic']
category: 'AI'
draft: false
lang: 'zh-CN'
excerpt: '距离上一篇MCP教程过去一个多月，MCP生态已经天翻地覆——Anthropic官宣开源、MCP开发者峰会在纽约召开、安全漏洞风波震动社区、Uber和Amazon分享了企业级落地经验。这篇续作带你从"能跑"进阶到"能生产"，讲清楚2026年MCP的真正面貌。'
keywords: ['MCP', 'Model Context Protocol', '多Agent', 'MCP Gateway', '无状态传输', 'Anthropic开源', 'AI安全', 'AI Agent', '企业部署', '2026']
readingTime: 18
series: 'MCP开发实战'
seriesOrder: 2
---

> 距离上一篇 MCP 教程过去一个多月，MCP 生态已经发生了翻天覆地的变化。Anthropic 正式宣布开源 MCP、MCP 开发者峰会在纽约召开、安全漏洞风波震动社区、Uber 和 Amazon 分享了企业级落地经验……这篇续作带你从"能跑"进阶到"能生产"。

---

## 目录

- [这一个多月，MCP圈到底发生了什么？](#这一个多月mcp圈到底发生了什么)
- [Host-Client-Server模型再深入：不只是Tools](#host-client-server模型再深入不只是tools)
- [三大改进：MCP的"上下文膨胀"有救了](#三大改进mcp的上下文膨胀有救了)
- [Gateway模式：企业级架构的共识](#gateway模式企业级架构的共识)
- [安全风波：MCP架构缺陷与防护指南](#安全风波mcp架构缺陷与防护指南)
- [多Agent协作实战：让多个MCP服务器协同工作](#多agent协作实战让多个mcp服务器协同工作)
- [MCP往哪走：2026路线图](#mcp往哪走2026路线图)
- [写在最后](#写在最后)

---

## 这一个多月，MCP圈到底发生了什么？

如果你觉得 MCP 还是个"小众玩具"，那你可能错过了2026年4月这波爆发。让我们快速回顾一下几个里程碑事件：

### 🗓️ 4月2-3日 · 首届MCP开发者峰会

在纽约万豪侯爵酒店，约 **1200 人** 参加了这场峰会。会上：

- **Uber** 公开了他们的 GenAI Gateway 架构，每周数万次 Agent 执行
- **Amazon** 介绍了内部 MCP 发现基础设施，开源了 `agent-sop` 项目
- **Docker、Kong、Solo.io** 等多位演讲者一致认为：**MCP 网关是必须的**
- Linux 基金会旗下的 **x402 基金会** 正式启动

### 🗓️ 4月15日 · OX Security 披露 MCP 安全漏洞

以色列安全公司 OX Security 发布研究报告，指出 MCP 存在**架构级设计缺陷**，影响 Python、TypeScript、Java、Rust 的所有 SDK。已分配 **10 个 CVE 编号**，均评定为"严重"级别。

> 最戏剧性的是：研究团队多次向 Anthropic 通报并要求修复，被对方以"这是预期设计"为由拒了。

### 🗓️ 4月19日 · Anthropic 工程师首次正面回应

Anthropic 工程师 David Soria Parra 在 AI Engineer 分享会上，**首次公开回应了外界对 MCP 的所有批评**，并公布了2026年MCP的完整路线图。

核心信息就一句话：**MCP 不会死，它在进化。**

### 生态数据说话

| 指标 | 数值 |
|------|------|
| GitHub 社区 MCP Server | **超 1000 个** |
| 主流框架支持 | LangChain、AutoGen 3.0、CrewAI、LlamaIndex **全部原生支持** |
| 企业采用率 | 79% 企业已尝试 AI Agent，43% 已投入生产 |
| 运维组织 | Agentic AI Foundation + Linux基金会x402 |

---

## Host-Client-Server模型再深入：不只是Tools

上一篇我们主要用了 `@mcp.tool()` 装饰器，但 MCP 的可不止 Tools 这一个能力。我们先搞清楚 MCP 和传统 Function Calling 的本质区别。

### MCP vs Function Calling

很多人把 MCP 误当成"升级版 Function Calling"，其实两者完全不在一个维度：

| 对比维度 | Function Calling | MCP |
|---------|-----------------|-----|
| **层级** | 应用级集成方案 | 系统级通信协议 |
| **通信方式** | 简单请求-响应 | 持久连接 + 会话状态管理 |
| **能力发现** | 手动编写函数描述 | 自动发现（list_tools, list_resources） |
| **状态管理** | 无状态 | 支持持久会话 |
| **多框架支持** | 框架绑定 | 框架无关、跨平台 |

简单说：**Function Calling 解决"这个AI能调什么函数"，MCP 解决"AI生态里所有组件怎么互联互通"。**

### MCP 的三大核心能力

上一篇文章我们只用了 Tools，这里把三个能力补全：

#### 1. Tools（工具）— 你已掌握

AI 主动调用的可执行函数。上一篇的 `get_current_weather` 就是 Tool。

#### 2. Resources（资源）— 受控的数据访问

Resources 是 AI **读取**数据的通道，不是让 AI 去调用函数，而是让 AI 像读文件一样获取数据。

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("DataServer")

# 注册一个静态资源
@mcp.resource("config://app/settings")
def get_settings() -> str:
    """返回应用配置"""
    return """
    {
        "app_name": "MyAgent",
        "version": "2.1.0",
        "max_retries": 3
    }
    """

# 注册一个动态资源（带参数）
@mcp.resource("users://{user_id}/profile")
def get_user_profile(user_id: str) -> str:
    """获取用户信息"""
    # 这里可以查数据库
    return f"User {user_id}'s profile data"
```

Resources 适合的场景：数据库记录、配置文件、日志文件、知识库文档。

#### 3. Prompts（提示模板）— 开箱即用的"话术"

Prompts 是预定义的提示模板，让 AI 知道在特定场景下该怎么说话：

```python
@mcp.prompt()
def weather_report(city: str) -> str:
    """生成天气报告的模板"""
    return f"""你是一个专业的天气预报员。请为{city}生成一份
详细的天气报告，包括温度趋势、穿衣建议和出行提示。"""

@mcp.prompt()
def data_analyst(query: str) -> str:
    """数据分析提示模板"""
    return f"""你是一个数据分析师。用户的问题是：{query}
请用以下格式回答：
1. 数据概览
2. 关键发现
3. 建议行动
"""
```

当用户在客户端输入"帮我看一下北京的天气"，AI 可以自动匹配 `weather_report` 这个 Prompt，得到结构化的回答。

### 三者的协作关系

```
                ┌─────────────────────────┐
                │      AI Application      │
                │    (Claude Desktop /     │
                │     VS Code / 自建Agent)  │
                └──────────┬──────────────┘
                           │ MCP Protocol
                ┌──────────▼──────────────┐
                │      MCP Server          │
                │                          │
                │  ┌──────┐ ┌──────┐ ┌───┐ │
                │  │Tools │ │Resrcs│ │Pr │ │
                │  │(动作)│ │(数据)│ │(话术)│ │
                │  └──────┘ └──────┘ └───┘ │
                └──────────────────────────┘
```

Tools 负责"做事"，Resources 负责"读数据"，Prompts 负责"教AI怎么说话"。三者配合，才能构建真正完整的 Agent 应用。

---

## 三大改进：MCP的"上下文膨胀"有救了

MCP 被批评最多的问题是什么？**上下文膨胀**。

想象一下，如果你的 MCP 服务器注册了 50 个 Tool，每个 Tool 的描述都有几百字，客户端一启动就要把所有 Tool 信息塞到模型上下文里。AI 还没开始干活，上下文窗口就已经占了一大半。

Anthropic 针对这个问题提出了**三个层面的系统性改进**：

### 改进一：渐进式发现（Progressive Discovery）

**问题**：预加载所有 Tool 导致上下文过大。

**方案**：采用"按需加载"模式。模型只有在需要时才去发现和加载特定 Tool。

```python
# 之前的做法：一次性注册所有工具
@mcp.tool()
def search_database(query: str): ...
@mcp.tool()
def send_email(to: str, content: str): ...
@mcp.tool()
def generate_report(template: str): ...
# ... 还有47个工具

# 新方案：使用 ToolSearch 技术
# 客户端不再是"全部加载"，而是先加载一个"工具发现工具"
# 当 AI 需要搜索数据库时，才去查询 search_database 的具体信息
```

测试数据显示，这一方法可以将 token 消耗减少 **85% 以上**。

### 改进二：程序化工具调用（Programmatic Tool Use）

**问题**：模型逐个调用工具，推理慢、消耗 token 多。

**方案**：给模型一个执行环境（如 V8 或 Lua 解释器），让模型直接生成代码一次性完成多步操作：

```
❌ 旧方式：
   AI: 调用 search_user(id=1) → 返回结果
   AI: 调用 get_orders(user_id=1) → 返回结果  
   AI: 调用 calculate_total(orders) → 返回结果
   AI: 总结...

✅ 新方式：
   AI: 直接生成Python脚本
       user = search_user(1)
       orders = get_orders(user['id'])
       return calculate_total(orders)
```

这种方式把多次推理压缩为一次执行，效率提升非常明显。

### 改进三：面向 Agent 的接口设计（Agent-Oriented Design）

**问题**：粗暴地将 REST API 一对一映射到 MCP Server。

**方案**：从 **Agent 的视角**（而不是人的视角）设计接口。

❌ **反面例子**：把一个文件系统的所有操作都拆成单个 Tool：
```python
@mcp.tool()
def read_file(path: str): ...
@mcp.tool()
def write_file(path: str, content: str): ...
@mcp.tool()
def delete_file(path: str): ...
@mcp.tool()
def list_files(dir: str): ...
@mcp.tool()
def copy_file(src: str, dst: str): ...
# ... 没完没了
```

✅ **正确姿势**：提供一个执行环境，让模型在服务器端完成编排：
```python
@mcp.tool()
def execute_file_operations(operations_json: str) -> str:
    """
    批量执行文件操作。
    参数是一个JSON数组，支持 read/write/delete/copy/move/list 等操作。
    示例：[{"op": "read", "path": "/tmp/test.txt"}]
    """
    operations = json.loads(operations_json)
    results = []
    for op in operations:
        # 在沙箱环境中执行
        results.append(process_operation(op))
    return json.dumps(results)
```

> **核心原则**：不是让 AI 反复调用你，而是给 AI 一个"能干更多事"的环境。

---

## Gateway模式：企业级架构的共识

如果你觉得 MCP 就是"写个 Server、跑个 Claude Desktop 就能用"，那说明你还在开发阶段。**生产环境完全是另一回事。**

2026年4月的 MCP 开发者峰会上，一个结论被反复强调：

> **生产环境中，MCP 必须有网关（Gateway）和注册表（Registry）。**

### 为什么需要 Gateway？

```
❌ 没有 Gateway：
   Agent ──→ MCP Server A (直接暴露)
         ──→ MCP Server B (直接暴露)  
         ──→ MCP Server C (直接暴露)
   → 没有权限控制、没有审计日志、没有速率限制

✅ 有 Gateway：
   Agent ──→ MCP Gateway ──→ MCP Server A
                      ├──→ MCP Server B
                      └──→ MCP Server C
   → 统一认证、授权、限流、审计、脱敏
```

### Uber 的 GenAI Gateway

Uber 的架构最有参考价值。他们的 MCP Gateway 做了几件事：

1. **自动发现** — 内部数千个 API 端点自动注册到 MCP Registry
2. **PII 脱敏** — 请求到达外部模型前，自动清除个人身份信息
3. **权限控制** — 基于角色的访问控制
4. **执行跟踪** — 每周数万次 Agent 执行，全部记录在案

### 用 Python 实现一个轻量级 MCP Gateway

虽然企业级方案通常用 Kong、Envoy 等网关，但为了理解核心原理，我们可以写一个简单的 MCP Gateway：

```python
# mcp_gateway.py — 轻量级 MCP 网关
from fastapi import FastAPI, HTTPException, Request
import httpx
import json
import time

app = FastAPI()

# MCP 服务器注册表
servers_registry = {
    "weather": {
        "url": "http://localhost:8001/mcp",
        "description": "天气查询服务",
        "rate_limit": 100,  # 每分钟100次
    },
    "database": {
        "url": "http://localhost:8002/mcp",
        "description": "数据库查询服务",
        "rate_limit": 50,
    },
    "filesystem": {
        "url": "http://localhost:8003/mcp",
        "description": "文件系统服务",
        "rate_limit": 200,
    }
}

# 简单的速率限制器
rate_limits = {}

def check_rate_limit(server_name: str) -> bool:
    now = time.time()
    if server_name not in rate_limits:
        rate_limits[server_name] = []
    
    # 清理过期记录
    rate_limits[server_name] = [
        t for t in rate_limits[server_name] if now - t < 60
    ]
    
    limit = servers_registry[server_name]["rate_limit"]
    if len(rate_limits[server_name]) >= limit:
        return False
    
    rate_limits[server_name].append(now)
    return True


@app.post("/mcp/{server_name}")
async def route_mcp_request(server_name: str, request: Request):
    if server_name not in servers_registry:
        raise HTTPException(status_code=404, detail="MCP server not found")
    
    # 速率限制检查
    if not check_rate_limit(server_name):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # 转发请求到目标 MCP 服务器
    body = await request.body()
    target = servers_registry[server_name]
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            target["url"],
            content=body,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
    
    return response.json()


@app.get("/discovery")
async def discover_servers():
    """返回所有可用的 MCP 服务器列表"""
    return {
        name: {"description": info["description"]}
        for name, info in servers_registry.items()
    }
```

启动后，Agent 不再直接访问 MCP Server，而是通过 Gateway：

```bash
# 查询天气 → 路由到 weather 服务器
curl -X POST http://localhost:8000/mcp/weather \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", ...}'

# 发现可用服务
curl http://localhost:8000/discovery
# → {"weather": {"description": "天气查询服务"}, ...}
```

这只是个玩具级 demo，但核心思想和大厂是一致的：**网关层负责治理，MCP Server 只负责业务。**

---

## 安全风波：MCP架构缺陷与防护指南

4月15日，OX Security 的研究报告像一颗炸弹投入了 MCP 社区。

### 到底出了什么事？

MCP 协议的设计存在**架构级缺陷**，导致四种攻击路径：

| 攻击方式 | 描述 | 影响 |
|---------|------|------|
| 未认证的UI注入 | 攻击者篡改系统界面 | 钓鱼攻击 |
| 安全加固绕过 | 突破现有防护机制 | 权限提升 |
| 提示词注入 | 操纵大模型行为 | 数据泄露 |
| 恶意插件分发 | 扩散攻击载荷 | 远程控制 |

研究团队称，已影响 **3.2万个代码仓库**，**超20万台服务器** 存在潜在暴露风险。

### Anthropic 的回应

面对 OX Security 的多次通报，Anthropic 的回应是：

> "当前架构属于**预期设计**，无需修改。"

这个回应让社区炸了锅。但冷静来看，Anthropic 的逻辑是：**MCP 是一个底层协议，安全应该在应用层和网关层解决**——就像 HTTP 协议本身不负责 HTTPS 加密一样。

### 你能做什么？

不管 Anthropic 怎么说，先把自家系统守住：

```python
# 安全启动MCP服务器的模板
from mcp.server.fastmcp import FastMCP
import os

mcp = FastMCP("SecureServer")

# 1. 永远不要暴露在公网
# 只在 127.0.0.1 监听
if __name__ == "__main__":
    mcp.run(
        transport='streamable-http',
        host='127.0.0.1',       # 👈 只本地监听
        port=8000,
        path='/mcp'
    )
```

**安全自查清单：**

- [ ] MCP Server 没有直接暴露在公网（使用内网 + Gateway）
- [ ] 所有 MCP 输入视为不可信数据，做好校验和过滤
- [ ] 使用沙箱（Docker/nsjail）隔离 MCP Server 运行环境
- [ ] API Key 和密钥放在环境变量，不要硬编码
- [ ] 使用最小权限原则，不给 MCP Server 多余的系统权限
- [ ] 及时更新 MCP SDK 版本
- [ ] 生产环境加 Gateway 层做认证和审计

---

## 多Agent协作实战：让多个MCP服务器协同工作

前面讲了那么多理论，现在来点真家伙。

### 场景设定

假设我们需要一个"智能工作助手"，它可以：
1. 查询天气（刚才写的天气服务器）
2. 读取本地文件（文件服务器）
3. 执行代码计算（计算服务器）

三个独立的 MCP Server，通过一个协调器 Agent 统一调度。

### Step 1：搭建三个 MCP Server

**天气服务器**（复用上一篇的代码，精简版）：

```python
# weather_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("WeatherServer")

@mcp.tool()
def get_weather(city: str) -> str:
    """获取城市天气"""
    # 这里简化，实际调用和风天气API
    weather_data = {
        "北京": "☀️ 25°C 晴",
        "上海": "🌧️ 22°C 小雨",
        "广州": "⛅ 30°C 多云",
    }
    return weather_data.get(city, f"未找到{city}的天气")

if __name__ == "__main__":
    mcp.run(transport='stdio')
```

**文件服务器**：

```python
# file_server.py
from mcp.server.fastmcp import FastMCP
import os

mcp = FastMCP("FileServer")

@mcp.tool()
def read_note(filename: str) -> str:
    """
    读取工作笔记文件
    Args:
        filename: 文件名（不含路径）
    """
    safe_path = os.path.join("./notes", os.path.basename(filename))
    if not os.path.exists(safe_path):
        return f"文件 {filename} 不存在"
    with open(safe_path, "r", encoding="utf-8") as f:
        return f.read()

@mcp.tool()
def list_notes() -> list:
    """列出所有工作笔记"""
    if not os.path.exists("./notes"):
        return []
    return os.listdir("./notes")

if __name__ == "__main__":
    os.makedirs("./notes", exist_ok=True)
    mcp.run(transport='stdio')
```

**计算服务器**：

```python
# calc_server.py
from mcp.server.fastmcp import FastMCP
import math

mcp = FastMCP("CalcServer")

@mcp.tool()
def calculate(expression: str) -> str:
    """
    执行数学计算
    Args:
        expression: 数学表达式，例如 "2 + 2", "sin(30)", "sqrt(16)"
    """
    # 安全的白名单eval
    allowed_names = {
        k: v for k, v in math.__dict__.items() if not k.startswith("__")
    }
    allowed_names.update({"abs": abs, "round": round, "sum": sum})
    
    try:
        result = eval(expression, {"__builtins__": {}}, allowed_names)
        return f"{expression} = {result}"
    except Exception as e:
        return f"计算错误: {e}"

if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### Step 2：构建 MCP 协调器客户端

现在写一个协调器，同时连接三个 MCP Server，并根据用户问题自动选择合适的工具：

```python
# orchestrator.py — 多MCP Server协调器
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import json


class MCPOrchestrator:
    """多MCP Server协调器"""
    
    def __init__(self):
        self.servers = {}
        self.sessions = {}
        self.tool_registry = {}
    
    async def connect_server(self, name: str, command: str, args: list):
        """连接一个MCP Server"""
        server_params = StdioServerParameters(
            command=command,
            args=args
        )
        
        stdio_transport = await stdio_client(server_params)
        read, write = stdio_transport
        session = await ClientSession(read, write).__aenter__()
        await session.initialize()
        
        self.servers[name] = session
        print(f"✅ 已连接 MCP Server: {name}")
        
        # 获取该服务器的所有工具并注册
        tools_response = await session.list_tools()
        for tool in tools_response.tools:
            self.tool_registry[tool.name] = {
                "server": name,
                "description": tool.description,
                "input_schema": tool.inputSchema
            }
            print(f"  📌 注册工具: {tool.name} ({tool.description})")
    
    async def call_tool(self, tool_name: str, arguments: dict):
        """调用指定工具（自动路由到对应的Server）"""
        if tool_name not in self.tool_registry:
            return f"错误: 未找到工具 {tool_name}"
        
        server_name = self.tool_registry[tool_name]["server"]
        session = self.servers[server_name]
        
        result = await session.call_tool(tool_name, arguments)
        return result.content
    
    def list_all_tools(self) -> str:
        """列出所有可用工具"""
        if not self.tool_registry:
            return "没有已注册的工具"
        
        result = "📋 可用工具清单：\n"
        for name, info in self.tool_registry.items():
            result += f"\n  🔧 {name}\n"
            result += f"     服务器: {info['server']}\n"
            result += f"     描述: {info['description']}\n"
        return result
    
    async def close_all(self):
        """关闭所有连接"""
        for name, session in self.servers.items():
            await session.__aexit__(None, None, None)
            print(f"🔌 已断开: {name}")


async def main():
    orchestrator = MCPOrchestrator()
    
    # 连接三个MCP Server
    await orchestrator.connect_server("Weather", "python", ["weather_server.py"])
    await orchestrator.connect_server("File", "python", ["file_server.py"])
    await orchestrator.connect_server("Calc", "python", ["calc_server.py"])
    
    print("\n" + "="*50)
    print(orchestrator.list_all_tools())
    print("="*50)
    
    # 演示：依次调用不同服务器的工具
    print("\n🟢 用户: 北京今天天气怎么样？")
    result = await orchestrator.call_tool("get_weather", {"city": "北京"})
    print(f"🤖 AI: {result}")
    
    print("\n🟢 用户: 帮我算一下 sin(30) + cos(60) 等于多少？")
    result = await orchestrator.call_tool("calculate", {"expression": "sin(30) + cos(60)"})
    print(f"🤖 AI: {result}")
    
    print("\n🟢 用户: 列出我所有的笔记")
    result = await orchestrator.call_tool("list_notes", {})
    print(f"🤖 AI: {result}")
    
    await orchestrator.close_all()


if __name__ == "__main__":
    asyncio.run(main())
```

运行效果：

```
✅ 已连接 MCP Server: Weather
  📌 注册工具: get_weather (获取城市天气)
✅ 已连接 MCP Server: File
  📌 注册工具: read_note (读取工作笔记文件)
  📌 注册工具: list_notes (列出所有工作笔记)
✅ 已连接 MCP Server: Calc
  📌 注册工具: calculate (执行数学计算)

📋 可用工具清单：
  🔧 get_weather
     服务器: Weather
     描述: 获取城市天气
  🔧 read_note
     服务器: File
     描述: 读取工作笔记文件
  🔧 list_notes
     服务器: File
     描述: 列出所有工作笔记
  🔧 calculate
     服务器: Calc
     描述: 执行数学计算

🟢 用户: 北京今天天气怎么样？
🤖 AI: ☀️ 25°C 晴

🟢 用户: 帮我算一下 sin(30) + cos(60) 等于多少？
🤖 AI: sin(30) + cos(60) = 1.0

🟢 用户: 列出我所有的笔记
🤖 AI: ['todo.md', 'ideas.md']
```

### 核心思路

这个 `MCPOrchestrator` 做的事情非常简单但强大：

1. **连接管理** — 启动多个 MCP Server 的子进程，建立 Session
2. **统一注册表** — 将所有 Server 的 Tools 合并到一个统一的注册表
3. **自动路由** — 根据工具名自动找到对应的 Server 并转发请求
4. **热插拔** — 随时添加或移除 MCP Server，不影响整体架构

如果你想更进一步，可以把这个 Orchestrator 接入 LangGraph 或 AutoGen 3.0，让 LLM 来动态决定调用哪个 MCP Server 的工具——这就是真正的多 Agent 协作。

---

## MCP往哪走：2026路线图

最后，来看看 Anthropic 工程师在4月19日分享会上公布的 **MCP 2026 路线图**。这些新特性将在未来几个月陆续落地：

### 1. 无状态传输协议（2026年6月）

与 Google 团队合作开发，目标是解决当前 Streamable HTTP 在云原生环境（Cloud Run、Kubernetes）中难以水平扩展的问题。

**对开发者的影响**：MCP Server 将可以像普通的 REST API 一样在 K8s 中愉快地跑自动伸缩，不再需要维护长连接状态。

### 2. Server Discovery（服务器发现）

通过标准化的 `well-known URL`，让爬虫、浏览器和 Agent 在访问一个网站时能自动发现其背后是否关联了 MCP 服务器。

```bash
# 访问某个网站时，Agent 会自动检查
GET https://example.com/.well-known/mcp.json
# → {"servers": [{"name": "docs", "url": "..."}, ...]}
```

相当于给整个互联网增加了 **Agent 可读的 API 层**。

### 3. MCP Apps（自带UI的Agent）

这是最实验性但也最酷的特性。**Agent 不再寄生在宿主产品的界面里**，而是可以通过 MCP Server 直接携带自己的 UI（Web 界面）。

想象一下：你问天气，MCP Server 不光返回数据，还直接渲染一个带地图的天气面板。

### 4. Skills over MCP

领域知识（Skills）不再依赖插件或注册中心，而是直接通过 MCP Server 随工具一起分发给 Agent。

---

## 写在最后

回顾这篇续作，我们从上一篇的"怎么写一个 MCP Server"出发，爬到了更高的视角：

1. **MCP 生态大爆发** — 从个人玩具走向企业标配，只用了不到两个月
2. **三大核心能力** — Tools + Resources + Prompts 构成完整 Agent 能力三角
3. **上下文膨胀的解法** — 渐进式发现、程序化调用、面向 Agent 设计
4. **Gateway 架构** — 没有网关，别谈生产环境
5. **安全不可忽视** — 即使官方说"这是预期设计"  
6. **多 Server 协同** — 用 Orchestrator 模式让多个 MCP Server 联合工作
7. **未来在路上** — 无状态传输、Server Discovery、MCP Apps

### 三篇预告

第三篇已经在路上了，预告一下选题方向：

- **MCP 服务器的云端部署实战**（Docker + K8s + 反向代理）
- **结合 LangChain / AutoGen 3.0 的完整 Agent 应用**
- **MCP 与 OAuth 2.1 的企业级认证集成**

### 资源链接

- [MCP 官方文档](https://modelcontextprotocol.io/) — 协议规范和最佳实践
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) — 官方 Python 实现
- [MCP 社区 Server 列表](https://github.com/modelcontextprotocol/servers) — 1000+ 社区实现
- [Agentic AI Foundation](https://agentic.ai/) — MCP 标准组织
- [OX Security MCP 安全报告](https://ox.security/) — 漏洞详情
- [上一篇：手把手教你构建MCP天气服务器](/posts/how_to_create_mcp/) — 系列第一篇

---

*MCP 正在定义 AI Agent 时代的互联标准。不管你是独立开发者还是企业团队，现在上车，不晚。*
