# JavBus Telegram Bot

<div align="center">

![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue?logo=telegram)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-yellow)

一个功能强大的 Telegram 番号查询机器人,支持 **JavDB(优先)**、JavBus、Pornhub、XHamster 等多个平台的内容搜索。

[功能特性](#功能特性) • [快速开始](#快速开始) • [部署教程](#部署教程) • [使用说明](#使用说明)

</div>

---

## 📋 目录

- [功能特性](#功能特性)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [详细部署教程](#详细部署教程)
  - [方式一：服务器部署（推荐）](#方式一服务器部署推荐)
  - [方式二：本地运行](#方式二本地运行)
- [使用说明](#使用说明)
- [配置说明](#配置说明)
- [常见问题](#常见问题)
- [更新日志](#更新日志)

---

## ✨ 功能特性

### 🎯 核心功能

- **🔍 番号查询** - 优先使用 **JavDB** 平台,失败时自动降级到 JavBus,无磁力时尝试 **Sukebei Nyaa**
- **📝 多格式支持** - 支持标准格式(`ssni-888`)和纯数字格式(`010126_01`)
- **🤖 自动登录** - 支持 JavDB 自动登录,突破查看限制
- **👑 管理员模式** - 配置管理员ID,解除搜索结果数量限制
- **🌟 演员搜索** - 根据演员名称搜索相关作品
- **🎲 随机推荐** - 随机推荐优质番号
- **📊 查询统计** - 记录和展示历史查询数据
- **🔗 多平台搜索** - 支持 Pornhub、XHamster 关键字搜索

### 🚀 技术特点

- ✅ **智能数据源** - JavDB -> JavBus -> Sukebei Nyaa 多源自动降级
- ✅ **自动突破限制** - 内置 Puppeteer 实现 JavDB 自动登录
- ✅ **多格式支持** - 支持 `ssni-888`、`010126_01` 等多种番号格式
- ✅ 使用 **Polling 模式**,无需配置 Webhook
- ✅ 支持 **私聊** 和 **群聊** 两种模式
- ✅ 自动区分私聊和群聊,限制群聊显示数量
- ✅ 使用 **PM2** 进程管理,稳定可靠
- ✅ 支持 **开机自启**,服务器重启后自动恢复

---

## 🏗️ 技术架构

```
javbus-bot/
├── server.js              # 主入口文件（Polling 模式）
├── index.js               # Cloudflare Worker 入口（已弃用）
```

**技术栈：**

- **运行环境**: Node.js 20+
- **核心依赖**:
  - `node-telegram-bot-api` - Telegram Bot API
  - `cheerio` - HTML 解析
  - `node-fetch` - HTTP 请求
  - `moment` - 时间处理
- **进程管理**: PM2

---

## 🚀 快速开始

### 前置要求

1. **服务器** - Linux 服务器（推荐 Debian/Ubuntu）
2. **Node.js** - 版本 18.0 或更高
3. **Telegram Bot Token** - 从 [@BotFather](https://t.me/botfather) 获取

### 一键部署（5分钟）

```bash
# 1. 下载代码
git clone https://github.com/zhengwuji/tg-av.git
cd tg-av

# 2. 安装依赖
npm install

# 3. 配置 Bot Token（编辑 src/config/index.js）
nano src/config/index.js

# 4. 启动 Bot
npm start

# 5. 使用 PM2 后台运行（推荐）
npm install -g pm2
pm2 start server.js --name javbus-bot
pm2 save
pm2 startup
```

---

## 📚 详细部署教程

### 方式一：服务器部署（推荐）

#### 步骤 1: 准备服务器

确保你有一台 Linux 服务器（VPS），并可以通过 SSH 连接。

```bash
# SSH 连接到服务器
ssh -p <端口> <用户名>@<服务器IP>

# 示例
ssh -p 22 root@192.168.1.100
```

```bash
# 创建项目目录
mkdir -p /root/javbus-bot
cd /root/javbus-bot

# 克隆代码（或使用 scp 上传）
git clone https://github.com/zhengwuji/tg-av.git .

# 或者使用 wget 下载压缩包
wget https://github.com/zhengwuji/tg-av/archive/refs/heads/main.zip
unzip main.zip
mv tg-av-main/* .
```

#### 步骤 4: 配置 Bot Token

编辑配置文件 `src/config/index.js`：

```bash
nano src/config/index.js
```

修改以下内容：

```javascript
export const BOT_TOKEN = getEnv('BOT_TOKEN', '你的Bot Token')
export const ROBOT_NAME = getEnv('ROBOT_NAME', '@你的Bot用户名')

// JavDB 自动登录配置（可选）
export const JAVDB_EMAIL = getEnv('JAVDB_EMAIL', '')
export const JAVDB_PASSWORD = getEnv('JAVDB_PASSWORD', '')

// 管理员配置（可选）
export const ADMIN_ID = getEnv('ADMIN_ID', '') // 设置你的 Telegram ID
```

**如何获取 Bot Token？**

1. 在 Telegram 中搜索 [@BotFather](https://t.me/botfather)
2. 发送 `/newbot` 创建新机器人
3. 按提示设置机器人名称和用户名
4. BotFather 会返回你的 Bot Token（格式：`123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`）

#### 步骤 5: 安装依赖

```bash
npm install
```

#### 步骤 6: 启动 Bot

**方法 A：直接启动（测试用）**

```bash
npm start
```

看到以下输出表示启动成功：

```
🤖 Telegram Bot 启动中...
📡 使用 Polling 模式接收消息
✅ Bot 已启动，等待消息...
```

**方法 B：使用 PM2 后台运行（生产环境推荐）**

```bash
# 安装 PM2
npm install -g pm2

# 启动 Bot
pm2 start server.js --name javbus-bot

# 查看运行状态
pm2 status

# 查看日志
pm2 logs javbus-bot

# 设置开机自启
pm2 startup
pm2 save
```

**PM2 常用命令：**

```bash
pm2 status              # 查看所有进程状态
pm2 logs javbus-bot     # 查看日志
pm2 restart javbus-bot  # 重启
pm2 stop javbus-bot     # 停止
pm2 delete javbus-bot   # 删除进程
pm2 monit               # 实时监控
```

#### 步骤 7: 测试 Bot

在 Telegram 中搜索你的 Bot 用户名，发送 `/start` 测试是否正常工作。

---

### 方式二：本地运行

适合开发测试或个人使用。

#### Windows 系统

```powershell
# 1. 安装 Node.js
# 从 https://nodejs.org/ 下载并安装

# 2. 下载代码
git clone https://github.com/zhengwuji/tg-av.git
cd tg-av

# 3. 安装依赖
npm install

# 4. 配置 Bot Token
# 编辑 src/config/index.js

# 5. 启动
npm start
```

#### macOS/Linux 系统

```bash
# 1. 安装 Node.js（使用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 2. 下载代码
git clone https://github.com/zhengwuji/tg-av.git
cd tg-av

# 3. 安装依赖
npm install

# 4. 配置 Bot Token
nano src/config/index.js

# 5. 启动
npm start
```

---

## 📖 使用说明

### 命令列表

| 命令 | 说明 | 示例 |
|------|------|------|
| `/start` | 显示帮助信息 | `/start` |
| `/av <番号>` | 查询番号信息 | `/av ssni-888` |
| `/star <演员名>` | 搜索演员作品 | `/star 三上悠亜` |
| `/random` | 随机推荐番号 | `/random` |
| `/state [天数]` | 查看查询历史 | `/state 5` |
| `/xv <关键字>` | Pornhub 搜索 | `/xv 麻豆` |
| `/show <分类>` | Pornhub 热门 | `/show ht` |
| `/xm <关键字>` | XHamster 搜索 | `/xm 4k` |

### 使用示例

#### 1. 查询番号

```
/av ssni-888
```

Bot 会返回：

- 📸 封面图片
- 📝 标题信息
- 🧲 磁力链接（最多10个）
- 🎬 在线观看链接

#### 2. 搜索演员

```
/star 三上悠亜
```

Bot 会返回该演员的相关作品列表。

#### 3. 随机推荐

```
/random
```

Bot 会随机推荐一个番号。

#### 4. 查看统计

```
/state 7
```

查看最近7天的查询统计。

### 私聊 vs 群聊

- **私聊模式**: 显示完整信息（最多10个磁力链接）
- **群聊模式**: 限制显示数量（最多3个链接），避免刷屏

---

## ⚙️ 配置说明

### 环境变量配置

你可以通过环境变量覆盖默认配置：

```bash
# 设置环境变量
export BOT_TOKEN="你的Bot Token"
export ROBOT_NAME="@你的Bot用户名"

# 启动 Bot
npm start
```

### 配置文件说明

编辑 `src/config/index.js`：

```javascript
// Bot Token（必填）
export const BOT_TOKEN = getEnv('BOT_TOKEN', '默认值')

// Bot 用户名（可选，用于提示）
export const ROBOT_NAME = getEnv('ROBOT_NAME', '@mybot')

// 允许的群组 ID（可选，留空表示允许所有群组）
// 允许的群组 ID（可选，留空表示允许所有群组）
export const ALLOWED_GROUPS = []

// JavDB 账号配置（可选，用于自动登录获取更多磁力链接）
// 建议在 .env 文件中配置
export const JAVDB_EMAIL = getEnv('JAVDB_EMAIL', '')
export const JAVDB_PASSWORD = getEnv('JAVDB_PASSWORD', '')

// 管理员配置（可选，解除搜索数量限制）
export const ADMIN_ID = getEnv('ADMIN_ID', '')
```

### 🔐 JavDB 自动登录配置

部分资源（如 `010126_01`）在 JavDB 上需要登录后才能查看磁力链接。本机器人内置了自动登录功能。

**配置步骤：**

1. 注册 [JavDB](https://javdb.com) 账号（免费）。
2. 在服务器的 `.env` 文件中添加账号密码：

```bash
# 编辑 .env 文件
nano /root/javbus-bot/.env

# 添加以下内容
JAVDB_EMAIL="你的邮箱"
JAVDB_PASSWORD="你的密码"
```

1. 重启 Bot：

```bash
pm2 restart javbus-bot
```

**注意：**

- 账号密码仅保存在你自己的服务器上，不会发送给第三方。
- 自动登录使用无头浏览器模拟，仅在需要时触发。

### 👑 设置管理员（解除限制）

管理员可以查看所有搜索结果（无数量限制）。

1. 获取你的 Telegram ID（可以向 [@userinfobot](https://t.me/userinfobot) 发送消息获取）。
2. 在 `.env` 文件中添加：

```bash
ADMIN_ID="你的数字ID"
```

1. 重启 Bot。

---

## ❓ 常见问题

### 1. Bot 无法启动？

**检查项：**

- ✅ Node.js 版本是否 >= 18
- ✅ Bot Token 是否正确配置
- ✅ 网络是否可以访问 Telegram API

**解决方法：**

```bash
# 查看详细错误日志
pm2 logs javbus-bot --lines 50
```

### 2. Bot 不响应消息？

**可能原因：**

- Bot Token 配置错误
- 服务器网络问题
- Bot 进程已停止

**解决方法：**

```bash
# 检查进程状态
pm2 status

# 重启 Bot
pm2 restart javbus-bot

# 查看日志
pm2 logs javbus-bot
```

### 3. 如何更新 Bot？

```bash
# 停止 Bot
pm2 stop javbus-bot

# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重启 Bot
pm2 restart javbus-bot
```

### 4. 如何备份数据？

```bash
# 备份 PM2 配置
pm2 save

# 备份项目目录
tar -czf javbus-bot-backup.tar.gz /root/javbus-bot
```

### 5. 服务器重启后 Bot 不自动启动？

确保已执行 PM2 开机自启设置：

```bash
pm2 startup
pm2 save
```

---

## 🔄 更新日志

### v1.1.0 (2026-01-05)

- ✨ **新增 Sukebei Nyaa 搜索源** - 解决部分冷门资源无磁力问题
- ✨ **新增 JavDB 自动登录** - 自动突破登录限制查看磁力链接
- ⚡ **优化搜索逻辑** - JavDB -> JavBus -> Sukebei 智能降级
- 🐛 **修复番号格式** - 完美支持 `010126_01` 等纯数字格式
- 📝 **更新文档** - 添加新功能说明和配置指南

### v1.0.0 (2026-01-05)

- ✨ 初始版本发布
- ✅ 支持 JavBus 番号查询
- ✅ 支持演员搜索
- ✅ 支持随机推荐
- ✅ 支持 Pornhub/XHamster 搜索
- ✅ 使用 Polling 模式，无需 Webhook
- ✅ 支持 PM2 进程管理

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) - Telegram Bot API 封装
- [cheerio](https://github.com/cheeriojs/cheerio) - HTML 解析库
- [PM2](https://pm2.keymetrics.io/) - Node.js 进程管理器

---

## 🚀 新增功能：受限内容保存 (SaveAny-Bot 集成)

机器人现在支持保存来自**禁止转发/保存**频道的内容。

### ⚙️ 配置要求

要使用此功能，您需要配置 Telegram Userbot（用户机器人）凭据。

1. **获取 API ID 和 Hash**：
    - 访问 [my.telegram.org](https://my.telegram.org) 并登录。
    - 点击 "API development tools"。
    - 创建一个新应用，获取 `App api_id` 和 `App api_hash`。

2. **生成 Session String**：
    - 在项目根目录运行脚本：

        ```bash
        node scripts/generate_session.js
        ```

    - 按照提示输入手机号、验证码和密码（如果有）。
    - 脚本将输出一段长字符串，这就是您的 `SESSION_STRING`。

3. **更新配置**：
    - 在 `.env` 文件或环境变量中添加：

        ```env

- **GitHub Issues**: [提交问题](https://github.com/zhengwuji/tg-av/issues)
- **Telegram**: [@myav147258bot](https://t.me/myav147258bot)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！**

Made with ❤️ by [zhengwuji](https://github.com/zhengwuji)

</div>
