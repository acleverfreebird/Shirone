---
title: "Codex CLI 安装与 New API 接入指南：在终端里使用 AI 编程助手"
published: 2026-06-13
description: "基于 New API 官方 Codex CLI 教程整理的完整上手指南，覆盖 Windows、macOS、Linux 安装 Codex CLI、配置 Node.js 环境、接入 New API、选择模型、设置权限以及常见问题处理。"
image: ""
tags: ["Codex CLI", "New API", "AI编程", "OpenAI", "终端工具"]
category: "技术教程"
draft: false
lang: "zh-CN"
permalink: "codex-cli-new-api-guide"
author: "FreeBird"
sourceLink: "https://www.newapi.ai/zh/docs/apps/codex-cli"
---

> 如果你需要一个稳定的 AI API 提供平台，可以尝试由我运行并维护的 **BIRD API**。
>
> 👉 [AI LLM](https://llmai.freebird2913.tech)
>
> 如果它对你有帮助，也欢迎支持一下。

# Codex CLI 安装与 New API 接入指南：在终端里使用 AI 编程助手

> 本文根据 [New API 官方 Codex CLI 教程](https://www.newapi.ai/zh/docs/apps/codex-cli)整理与扩展，面向想在本地终端中使用 AI 编程助手的用户。
>
> 如果你已经熟悉 VS Code 插件类 AI 编程工具，那么 Codex CLI 可以理解为一个运行在命令行里的编码代理：它可以读写项目文件、生成补丁、执行命令，并通过权限策略控制每一步操作。

---

## 一、Codex CLI 是什么？

**Codex CLI** 是 OpenAI 提供的终端式 AI 编程助手。它运行在你的本地开发环境中，可以在命令行里和你对话，并协助完成代码阅读、代码修改、补丁生成、命令执行、测试运行等任务。

和普通聊天机器人不同，Codex CLI 更偏向“工具驱动”的编码代理：

| 能力     | 说明                                                 |
| -------- | ---------------------------------------------------- |
| 终端交互 | 直接在命令行中输入需求，让 AI 根据当前项目上下文工作 |
| 文件编辑 | 通过补丁方式修改项目文件，更容易审计变更             |
| 命令执行 | 可以运行测试、构建、格式化等命令                     |
| 计划追踪 | 复杂任务可拆成多个步骤，逐步推进                     |
| 权限控制 | 支持只读、工作区写入、审批等模式，降低误操作风险     |
| 模型切换 | 可以通过配置接入不同模型服务                         |

本文重点介绍如何安装 Codex CLI，并将它接入 **New API**。

---

## 二、准备工作

开始之前，建议先准备好以下内容：

- 一台 Windows、macOS 或 Linux 电脑；
- 可用的终端环境；
- Node.js 与 npm 环境；
- 已部署或已获得授权使用的 New API 服务地址；
- 可用的 API Key；
- 一个用于测试的本地项目目录。

> 合规提醒：请只接入你自己部署、组织授权或明确具备合法上游授权的 API 服务。不要把来源不明的 API 地址或密钥用于生产项目。

---

## 三、Windows 安装指南

Windows 用户建议优先使用 **WSL2**。这样可以获得更接近 Linux 的终端体验，也更适合运行开发工具链。

### 1. 打开 PowerShell

建议使用 PowerShell，而不是传统 CMD。如果遇到权限问题，可以右键选择“以管理员身份运行”。

### 2. 安装 WSL2

在 PowerShell 中执行：

```powershell
wsl --install
```

安装完成后，根据提示重启电脑。

如果已经安装过 WSL，可以先检查版本：

```powershell
wsl --version
```

### 3. 进入 WSL 环境

重启后打开 PowerShell，执行：

```powershell
wsl
```

进入 WSL 后，后续 Node.js、npm、Codex CLI 的安装建议都在 WSL 里完成。

### 4. 安装 NVM

在 WSL 终端中执行：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
```

安装完成后，重新打开一个 WSL 终端，或执行 shell 配置文件使其生效。

### 5. 安装 Node.js 22

Codex CLI 需要 Node.js 环境。这里以 Node.js 22 为例：

```bash
nvm install 22
nvm use 22
```

检查安装结果：

```bash
node --version
npm --version
```

如果能看到版本号，说明 Node.js 与 npm 已经可用。

### 6. 安装 Codex CLI

在 WSL 中执行：

```bash
npm install -g @openai/codex
```

安装完成后验证：

```bash
codex --version
```

能输出版本号就代表安装成功。

### 7. 配置 New API

New API 教程中提供了一键配置脚本。Windows 端可在 PowerShell 中执行：

```powershell
iex (irm 'https://raw.githubusercontent.com/QuantumNous/new-api-docs/refs/heads/main/helper/codex-cli-setup.ps1')
```

执行前建议先打开脚本链接查看内容，确认脚本来源可信，再运行。

### 8. 启动 Codex CLI

进入 WSL：

```powershell
wsl
```

进入你的项目目录，例如：

```bash
cd /mnt/c/path/to/your/project
```

启动 Codex CLI：

```bash
codex
```

启动后可以按照提示选择权限模式、模型，并开始对话。

---

## 四、macOS 安装指南

macOS 用户可以使用 Homebrew 安装 Node.js，然后通过 npm 安装 Codex CLI。

### 1. 安装 Homebrew

如果你已经安装过 Homebrew，可以跳过这一步。

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

安装完成后检查：

```bash
brew --version
```

### 2. 安装 Node.js

更新 Homebrew：

```bash
brew update
```

安装 Node.js：

```bash
brew install node
```

检查版本：

```bash
node --version
npm --version
```

如果能正常显示版本号，就可以继续安装 Codex CLI。

### 3. 安装 Codex CLI

```bash
npm install -g @openai/codex
```

如果遇到权限问题，可以临时使用：

```bash
sudo npm install -g @openai/codex
```

不过更推荐配置 npm 全局目录到用户目录，减少长期依赖 sudo 的情况。

验证安装：

```bash
codex --version
```

### 4. 配置 New API

macOS 可使用官方教程中的 shell 脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/QuantumNous/new-api-docs/refs/heads/main/helper/codex-cli-setup.sh | bash
```

同样建议先查看脚本内容，再决定是否执行。

### 5. 启动 Codex CLI

直接在终端中启动：

```bash
codex
```

或者进入某个项目后启动：

```bash
cd /path/to/your/project
codex
```

---

## 五、Linux 安装指南

Linux 用户通常可以通过系统包管理器安装 Node.js，也可以使用 NodeSource 或 NVM。

以下以 Ubuntu / Debian 系为例。

### 1. 安装 Node.js 环境

添加 NodeSource 仓库：

```bash
sudo curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
```

安装 Node.js：

```bash
sudo apt-get install -y nodejs
```

检查版本：

```bash
node --version
npm --version
```

### 2. 安装 Codex CLI

```bash
npm install -g @openai/codex
```

如果提示权限不足，可以使用：

```bash
sudo npm install -g @openai/codex
```

验证安装：

```bash
codex --version
```

### 3. 配置 New API

Linux 端可执行：

```bash
curl -fsSL https://raw.githubusercontent.com/QuantumNous/new-api-docs/refs/heads/main/helper/codex-cli-setup.sh | bash
```

执行脚本时通常需要填写或确认 API 地址、API Key、默认模型等配置。

### 4. 启动 Codex CLI

进入项目目录：

```bash
cd /path/to/your/project
```

启动：

```bash
codex
```

---

## 六、接入 New API 后需要关注什么？

配置完成后，Codex CLI 会将模型请求发送到你配置的 New API 接入点。也就是说，即使界面中显示的是某些预设模型名称，实际调用也会走你配置的 API 地址。

因此需要重点确认三件事：

1. **API 地址是否正确**  
   地址应指向你自己的 New API 服务或可信服务方提供的接入点。

2. **API Key 是否有效**  
   密钥要有对应模型的调用权限，并注意不要提交到 Git 仓库。

3. **模型名称是否匹配**  
   Codex CLI 中选择的模型名称，需要能被 New API 正确路由到后端模型。

如果调用失败，优先检查接口地址、密钥权限、模型名称、账户余额或服务端日志。

---

## 七、第一次使用 Codex CLI

启动 Codex CLI 后，你可以从简单任务开始测试，例如：

```text
请阅读这个项目的 README，并总结项目的启动方式。
```

或者：

```text
请帮我检查当前项目是否有明显的配置问题，先不要修改文件，只给出分析。
```

如果你希望它直接修改文件，可以明确说明：

```text
请修复这个组件中的类型错误，并以最小改动提交补丁。
```

建议初次使用时先选择较保守的权限模式，让每次文件修改或命令执行都经过确认。熟悉后再根据项目情况放宽权限。

---

## 八、权限模式怎么选？

Codex CLI 的一个核心优势是权限可控。常见思路如下：

| 场景                   | 建议权限       |
| ---------------------- | -------------- |
| 只想让它分析项目       | 只读模式       |
| 希望它修改当前项目文件 | 工作区写入模式 |
| 对命令执行不放心       | 每次执行前审批 |
| 自动化修复小问题       | 可适当减少审批 |

初学者建议遵循两个原则：

- 不确定时，选择需要手动确认的模式；
- 涉及删除文件、重置 Git、安装依赖、访问网络等操作时，务必先确认命令含义。

---

## 九、切换模型

进入 Codex CLI 后，可以使用模型切换命令：

```text
/model
```

然后根据界面提示选择模型。

如果模型列表或调用行为不符合预期，通常需要回到 New API 后台检查：

- 模型是否已添加；
- 渠道是否正常；
- 模型名称是否和 Codex CLI 配置一致；
- API Key 是否有权限调用该模型。

---

## 十、常见问题处理

### 1. npm 全局安装提示权限错误

macOS / Linux 可以尝试：

```bash
sudo npm install -g @openai/codex
```

或者配置 npm 全局目录到用户目录：

```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

为了长期生效，可以把 PATH 配置写入 `~/.bashrc`、`~/.zshrc` 等 shell 配置文件。

### 2. Linux 缺少编译依赖

Ubuntu / Debian：

```bash
sudo apt install build-essential
```

CentOS / RHEL / Fedora 系：

```bash
sudo dnf groupinstall "Development Tools"
```

### 3. macOS 阻止运行

如果系统安全策略阻止运行，可以到：

```text
系统设置 → 隐私与安全性
```

找到相关提示并允许运行。

也可以检查是否是终端权限、网络权限或 npm 安装目录权限导致的问题。

### 4. Windows 杀毒软件误报

部分安全软件可能会拦截命令行工具、脚本下载或 npm 全局安装。建议：

- 确认下载来源；
- 检查脚本内容；
- 将可信目录加入白名单；
- 避免直接运行来源不明的脚本。

### 5. Codex CLI 能启动，但模型调用失败

按顺序检查：

1. New API 服务是否可访问；
2. API Key 是否正确；
3. Key 是否有模型权限；
4. 模型名称是否配置正确；
5. 后端渠道是否健康；
6. 是否触发额度、频率或内容安全限制。

---

## 十一、安全建议

Codex CLI 很适合提高开发效率，但它毕竟可以读写文件、执行命令，因此使用时要注意安全边界：

- 不要在不可信项目中开启过高权限；
- 不要把 API Key 写入代码仓库；
- 不要让 AI 在未确认的情况下执行破坏性命令；
- 修改前后使用 Git 查看差异；
- 对生产项目保持人工审查；
- 一键脚本执行前先查看脚本内容。

一个比较稳妥的工作流是：

```bash
git status
codex
git diff
git status
```

这样可以清楚知道 Codex CLI 做了哪些修改。

---

## 十二、总结

Codex CLI 适合喜欢终端工作流的开发者。它不像普通聊天工具那样只提供文本建议，而是可以结合当前仓库上下文，帮助你阅读代码、修改文件、执行命令和验证结果。

如果你已经有 New API 服务，那么接入 Codex CLI 后，就可以把模型能力整合进本地开发环境中：

- Windows 推荐使用 WSL2；
- macOS 推荐 Homebrew + npm；
- Linux 可使用 NodeSource、系统包管理器或 NVM；
- 配置 New API 时注意 API 地址、Key 与模型名称；
- 初次使用建议开启审批，熟悉后再调整权限。

完成这些配置后，你就可以在终端中运行：

```bash
codex
```

然后开始让 AI 协助你完成代码分析、功能开发和问题排查了。
