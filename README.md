# 求职助手（Job Seeker）

系统化记录和管理秋招 / 实习求职全流程的个人应用。基于 **Next.js + Prisma(SQLite)**，可**以桌面 App（Electron）方式运行，也可以网页方式运行**。

> 界面为漫威电影风格：动态浮动的图表卡片、求职转化漏斗、公司岗位进度、投递趋势监控（月/周切换 + 时间范围选择）、笔试/面试倒计时等。主题深浅色自动跟随系统。

---

# 手把手：从零配置开发环境

下面从「什么都没有的电脑」开始，一步步把环境配好、把应用跑起来。跟着做就行。

## 第 1 步：确认 / 安装 Node.js

应用需要 **Node.js ≥ 20**（开发时用的 v24）。

先检查电脑上有没有装：

```bash
node -v   # 应显示 v20 或更高，例如 v24.x.x
npm -v    # 应显示 v10 或更高
```

- ✅ 有且版本够 → 跳到「第 2 步」
- ❌ 没有 / 版本太低 → 用下面的方式装一个：

**方式 A：官网安装包（最简单）**
去 https://nodejs.org 下载 LTS 版本，一路「下一步」装完。

**方式 B：nvm（推荐，方便切换版本）**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# 重开终端后
nvm install 24
nvm use 24
```

装完再执行一遍 `node -v` / `npm -v` 确认。

---

## 第 2 步：进入项目目录

```bash
cd /你的路径/Job-Seeker
```

（如果你还没拿到项目代码，先把它拷贝/克隆到这个目录。）

---

## 第 3 步：安装依赖

```bash
npm install
```

这会安装所有依赖，包括 Electron（桌面壳）。

> ⚠️ **安装时可能看到这些提示，都是正常的：**
> - `npm warn Unknown project config "electron_mirror"` —— 无害提示。项目在 `.npmrc` 里配了 electron 镜像源（GitHub 直连不稳定时用），让 electron 二进制走 npmmirror 下载。**忽略即可**。
> - 如果 electron 二进制下载很慢或失败，说明镜像没生效，可以手动指定：`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install`。

---

## 第 4 步：配置环境变量（.env）【重要】

应用需要一个 `.env` 文件来存放配置。**如果项目里已有 `.env` 文件，这一步可以跳过。**

如果没有，在项目根目录新建一个 `.env` 文件，填入以下内容：

```bash
# ── 数据库（SQLite，本地文件，无需额外安装）──
DATABASE_URL="file:./dev.db"

# ── LLM 智能解析（简历解析 / 岗位信息提取）──
# 推荐用 DeepSeek（便宜、够用）
LLM_PROVIDER="deepseek"
LLM_MODEL="deepseek-chat"
DEEPSEEK_API_KEY="sk-你的key"

# （可选）用 Claude 也可以，二选一：
# LLM_PROVIDER="anthropic"
# LLM_MODEL="claude-sonnet-5-20251001"
# ANTHROPIC_API_KEY="sk-ant-你的key"
```

### 怎么拿到 DeepSeek 的 API Key

1. 打开 https://platform.deepseek.com 注册账号
2. 进入「充值」页面充值（最少几块钱就够测试）
3. 进入「API Keys」→ 创建一个 Key
4. 把 `sk-...` 那串复制，填到 `.env` 的 `DEEPSEEK_API_KEY=`

> 💡 **不配 LLM 也能跑**：数据库、记录、浏览等功能都能用；只有「简历解析」「岗位智能提取」这类 AI 功能不可用。想体验完整功能就配一个。

---

## 第 5 步：初始化数据库

```bash
# 创建/更新数据库表结构（SQLite 文件在 prisma/dev.db）
npm run db:push

# （可选）写入一份示例数据，方便看效果
npm run db:seed
```

> 以后改了 `prisma/schema.prisma` 里的数据模型，重新跑 `npm run db:push` 即可同步。

---

## 第 6 步：启动应用

### 方式 A：桌面 App（推荐，不用开浏览器）

```bash
# 第一次运行，先构建生产版（启动最快）
npm run app:build

# 之后日常使用，后台启动（终端秒释放）
npm run app:bg
```

启动后桌面会弹出「求职助手」窗口。详情见下文「三、桌面 App 启动」。

### 方式 B：网页模式（开发调试）

```bash
npm run dev
```

浏览器打开 http://localhost:3000 即可。

---

## ✅ 验证成功

- 桌面 App 弹出窗口、能正常操作 → 环境配置成功 🎉
- 网页模式 http://localhost:3000 能打开 → 成功 🎉

如果失败，看「七、常见问题」排查。

---

# 常用命令速查

| 命令 | 作用 |
|------|------|
| `npm run dev` | 网页开发模式（热更新） |
| `npm run app` | 桌面 App 前台启动（终端看日志） |
| `npm run app:bg` | 桌面 App 后台启动（日常推荐） |
| `npm run app:dev` | 桌面 App 开发模式（代码改动热更新） |
| `npm run app:build` | 先构建生产版再启动桌面 App |
| `npm run build` | 生产构建（`.next`） |
| `npm run start` | 启动生产服务（网页） |
| `npm run db:push` | 同步数据库结构 |
| `npm run db:seed` | 写入示例数据 |
| `npm run icon` | 重新生成 App 图标（需 Python + PIL，可选） |
| `npx prisma studio` | 可视化查看数据库 |

---

# 三、桌面 App 启动（推荐）

无需打开浏览器，一条命令即可启动本地桌面 App。App 会自动拉起本地服务、打开 1440×960 的窗口。

### 启动命令

| 命令 | 说明 |
|------|------|
| `npm run app` | **前台启动**。终端会持续显示日志，方便排查问题 |
| `npm run app:bg` | **后台启动（日常推荐）**。终端立即释放，不占用；App 在后台独立运行 |
| `npm run app:dev` | **开发模式**。Next 开发服务器，代码改动自动热更新 |
| `npm run app:build` | **先构建生产版本，再启动**。首次或改过代码后建议使用，启动更快 |

### 首次使用建议流程

```bash
# 第一次运行（先构建生产版，启动最快）
npm run app:build

# 之后日常使用（后台启动，秒开）
npm run app:bg
```

### 后台启动的日志

后台模式下，日志写入 `/tmp/jobseeker-app.log`：

```bash
# 查看最新日志
tail -f /tmp/jobseeker-app.log
```

### App 启动后会发生什么

1. 自动检测 3000 端口是否已有服务在跑（比如你先跑了 `npm run dev`）——有则直接复用，没有则自动启动
2. 优先用生产构建（`.next`）启动 `next start`（约几十毫秒就绪）；没有构建则退回 `next dev`
3. 服务就绪后弹出桌面窗口
4. **单实例保护**：重复运行启动命令不会开第二个窗口，而是聚焦已打开的窗口

### 端口占用说明

App 使用 **3000 端口**。如果被其它程序占用，启动会失败并弹出提示框；先释放端口再启动：

```bash
# 查看谁占了 3000 端口
lsof -i :3000

# 结束占用进程（按输出里的 PID 调整）
kill -9 <PID>
```

---

# 四、桌面 App 关闭（退出）

> 设计为「关窗口不退出」（持久化）：点红叉只关闭窗口，App 和本地服务继续在后台运行，点 **Dock 图标**即可重新打开窗口。要**彻底退出**，用下面任意一种方式：

### 方式一：快捷键 Cmd+Q（最推荐）

1. 先点一下窗口或 Dock 图标，让 App 处于前台
2. 按 `Cmd + Q`
3. App 退出，本地服务自动关闭

### 方式二：菜单栏退出

点击屏幕顶部菜单栏的 **求职助手 → 退出求职助手**。

### 方式三：终端命令（强制结束）

```bash
pkill -f "Electron.app"
```

### 行为总结

| 操作 | 结果 |
|------|------|
| 点红叉关闭窗口 | App 继续后台运行，服务不断 |
| 点 Dock 图标 | 重新打开窗口 |
| **Cmd+Q / 菜单「退出求职助手」** | **彻底退出，本地服务自动关闭** |
| `pkill -f "Electron.app"` | 强制退出，本地服务自动关闭 |

> 退出时服务会自动清理，不会留下占用 3000 端口的残留进程。

---

# 五、网页模式运行（不用桌面壳时）

仍可像普通 Next.js 应用一样用浏览器访问 `http://localhost:3000`：

```bash
npm run dev        # 开发模式（热更新）
npm run build      # 生产构建
npm run start      # 启动生产服务
```

---

# 六、开发中常用命令

```bash
npm run dev          # 网页开发模式
npm run app:dev      # 桌面开发模式（改代码热更新，适合开发）
npm run app:build    # 构建 + 启动桌面（适合改了代码后看效果）
npm run db:push      # 改了 prisma/schema.prisma 后同步数据库
npm run icon         # 换了 src/imgs/icon.jpeg 后重新生成 App 图标
```

---

# 七、常见问题（FAQ）

### Q1：`npm run` 时提示 `npm warn Unknown project config "electron_mirror"`？

无害提示，可忽略。这是 npm 11 对自定义配置的提示，用于让 electron 二进制走镜像源下载。

### Q2：App 弹「启动失败」？

通常是 3000 端口被占用。按上文「端口占用说明」释放端口后重试，或看终端 / 日志里的报错。

### Q3：改完代码，桌面 App 里没变化？

桌面 App 用的是**生产构建**（`.next`），改代码后要重新构建：`npm run app:build`。开发期想看热更新用 `npm run app:dev`。

### Q4：简历解析 / 智能功能不可用？

检查 `.env` 是否配了 `DEEPSEEK_API_KEY`（或 `ANTHROPIC_API_KEY`）。没配 LLM 的话这些 AI 功能不可用，但其它功能正常。

### Q5：关掉窗口后如何再打开？

点 Dock 上的图标即可（App 仍在后台运行）。如果没有图标，说明已经彻底退出，重新运行启动命令即可。

### Q6：想让"关闭窗口"直接退出怎么办？

目前默认是持久化（关窗不退出）。如果你更习惯关窗即退，可以修改 `electron/main.js` 里的 `window-all-closed` 逻辑，把 macOS 分支也改成 `app.quit()`。

### Q7：数据存在哪里？

SQLite 数据库文件：`prisma/dev.db`。所有投递、事件、公司等数据都存这里，删除该文件即清空数据。

### Q8：主题色不对 / 不跟随系统？

应用会**每次启动跟随系统深浅色**，系统切换时会实时跟随。手动点右上角太阳/月亮只对本会话生效。如果异常，多半是残留的旧实例/旧构建，退出重开（`Cmd+Q` 后 `npm run app:bg`）即可。

---

# 八、目录结构（核心）

```
electron/main.js        # Electron 桌面壳：拉起服务、窗口、菜单、持久化、主题跟随
electron/preload.js     # 页面加载前设置主题（Electron）
src/app/                # Next.js 页面（Dashboard / 资讯 / 行业 / 求职历程 / 爬虫 / 邮件同步）
src/components/dashboard/# 漏斗、公司进度、趋势监控、倒计时、浮动卡片等图表组件
src/components/layout/  # 侧边栏、顶栏、主题控制器
src/lib/                # 业务逻辑（prisma、阶段模型、邮箱、爬虫、简历解析等）
prisma/                 # 数据模型与数据库
public/pdf.worker.mjs   # pdf.js 渲染简历所需 worker
```

---

# 技术栈

- **Next.js 16** + React 19 + TypeScript + Tailwind CSS 4
- **Prisma** + SQLite（数据持久化）
- **Electron**（桌面壳，含持久化、单实例、系统主题跟随）
- **pdf.js**（简历 PDF 预览，文字可选中）
- lucide-react 图标、node-cron 定时爬虫、Playwright、IMAP 邮件同步
