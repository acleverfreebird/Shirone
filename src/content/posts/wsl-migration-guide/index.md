---
title: "WSL 迁移指南：如何将 Linux 发行版安全移动到其他盘符"
published: 2026-06-06T14:00:00.000Z
description: "随着 WSL 的深入使用，系统盘空间往往会变得紧张。本文将详细介绍如何通过 WSL 自带的导出与导入功能，安全高效地将已安装的 Linux 发行版（如 Ubuntu、Kali Linux）迁移到其他非系统盘盘符（如 D 盘），并恢复默认用户设置。"
image: ""
tags: ["WSL2", "Linux", "Windows", "系统优化", "运维"]
category: "Linux"
draft: false
lang: "zh-CN"
author: "freebird2913"
---

## 前言

默认情况下，通过 Microsoft Store 安装的 WSL（Windows Subsystem for Linux）发行版会被放置在 C 盘的 `AppData` 隐藏目录下。随着你在 Linux 镜像中安装越来越多的开发工具、Docker 镜像和依赖包，C 盘的空间会被迅速蚕食，直至亮起红灯。

幸运的是，WSL 提供了强大的导入导出命令，允许我们非常轻松地将整个 Linux 子系统打包并迁移至其他空闲的分区（如 D 盘、E 盘等）。本文将手把手带你完成这一迁移过程，并在迁移后恢复原先的默认登录用户。

---

## 1. 准备工作

在开始迁移之前，建议确认以下两点：

1. **确定要迁移的发行版名称**
   打开 PowerShell，执行以下命令查看当前已安装的发行版：

   ```powershell
   wsl --list --verbose
   ```

   _注意输出中的 `NAME` 栏，例如 `Ubuntu-22.04` 或 `kali-linux`。_

2. **关闭所有运行中的 WSL 实例**
   为保证迁移过程中数据的一致性，必须先关闭所有 WSL 实例。执行以下命令强制终止所有正在运行的子系统：
   ```powershell
   wsl --shutdown
   ```
   确认状态后，可以再次运行 `wsl --list --verbose` 确认其 `STATE` 变为了 `Stopped`。

---

## 2. 导出（打包）Linux 发行版

我们将原有的发行版打包成一个 `.tar` 文件。

1. **新建临时存放目录或目标目录**
   例如，我们希望将发行版最终迁移到 `D:\WSL\Ubuntu`。我们可以先在 D 盘新建该文件夹。

2. **执行导出命令**
   在 PowerShell 中运行以下命令（请根据你的发行版名称和实际存放路径进行修改）：
   ```powershell
   # 语法：wsl --export <发行版名称> <导出路径及文件名>
   wsl --export Ubuntu-22.04 D:\WSL\Ubuntu-22.04-backup.tar
   ```
   _该过程的时间长短取决于你的 Linux 系统中存储的文件大小。当命令返回且没有报错时，说明导出成功。_

---

## 3. 注销（删除）C 盘中的旧发行版

在将备份导入新路径之前，需要先注销并清理掉原来位于 C 盘的发行版。

> **⚠️ 注意：** 此操作会永久删除 C 盘上该发行版的所有数据。请务必确认在上一步中已成功导出了 `.tar` 文件！

在 PowerShell 中执行：

```powershell
# 语法：wsl --unregister <发行版名称>
wsl --unregister Ubuntu-22.04
```

注销后，再次运行 `wsl -l -v`，你将看到该发行版已从列表中消失，C 盘空间也随之释放。

---

## 4. 导入发行版到新盘符

现在，我们将刚才导出的 `.tar` 文件重新导入到新的盘符和路径中。

1. **创建存放目标路径的文件夹（若未创建）**

   ```powershell
   mkdir D:\WSL\Ubuntu
   ```

2. **执行导入命令**
   ```powershell
   # 语法：wsl --import <新发行版名称> <目标安装路径> <备份tar文件路径> --version 2
   wsl --import Ubuntu-22.04 D:\WSL\Ubuntu D:\WSL\Ubuntu-22.04-backup.tar --version 2
   ```
   _注：你也可以通过指定不同的新发行版名称来达到“克隆”或“重命名”发行版的效果。_

导入完成后，再次运行 `wsl -l -v` 即可看到新发行版已经处于 `Stopped` 状态，随时可以启动。

此时，你可以删除第 2 步中生成的临时备份文件 `D:\WSL\Ubuntu-22.04-backup.tar` 以释放空间。

---

## 5. 恢复默认登录用户

通过 `wsl --import` 导入的新发行版，默认会以 `root` 用户登录。这可能会导致原来的用户配置、环境变量或权限出现偏差。我们需要配置使其默认以你原本的普通用户身份登录。

### 方法一：通过注册表修改（通用且推荐）

无论是什么发行版，都可以通过修改 Windows 注册表来设置默认登录用户。

1. 按下 `Win + R` 键，输入 `regedit` 并回车，打开注册表编辑器。
2. 导航到以下路径：
   ```text
   HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Lxss
   ```
3. 该路径下会有几个类似于 UUID 的子项（如 `{a1b2c3d4-e5f6-...}`），依次点击它们，查看右侧的 `DistributionName` 键值，找到你刚才迁移的发行版名称（例如 `Ubuntu-22.04`）。
4. 找到对应子项后，双击右侧的 `DefaultUid`。
5. 将基数切换为 **十进制**，修改其值为你原用户的 UID（通常第一个创建的普通用户 UID 是 `1000`）。
   _如果不确定，可以先进入 WSL 运行 `id -u <用户名>` 查看。若想用 root，则设为 `0`。_
6. 修改完成后关闭注册表编辑器，重新打开终端启动 WSL，即可发现已恢复默认用户登录。

### 方法二：通过发行版可执行文件修改（部分发行版适用）

如果你使用的是官方的 Windows Store 发行版（且保留了其特定别名配置），可以在 PowerShell 中执行以下命令：

```powershell
# 语法：<发行版命令> config --default-user <用户名>
# 例如 Ubuntu 22.04：
ubuntu2204 config --default-user myusername
```

_如果提示命令未找到，代表该发行版不是通过 Store 管理的或被注销后别名失效，请直接采用**方法一**。_

---

## 6. 验证迁移结果

最后，我们可以进入新迁移的 WSL 发行版中进行全面验证：

```powershell
wsl -d Ubuntu-22.04
```

进入后，检查以下几点：

- 当前登录用户是否正确（`whoami`）
- 原来的文件和目录是否完好
- 网络连接及 Docker、各服务是否能正常运行

至此，WSL 发行版便成功且安全地迁移到了新的盘符，彻底解决系统盘空间不足的燃眉之急！
