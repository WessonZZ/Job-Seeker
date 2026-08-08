# 🦸 求职助手（Job Seeker）

> 你的秋招/实习求职「超级英雄总部」——系统化记录投递、笔试、面试、Offer，还能实时追踪进度。

基于 **Next.js + Prisma(SQLite)**，既能当**桌面 App**（Electron）用，也能网页访问。界面是**漫威电影风**：会飘的图表卡片、转化漏斗、公司进度条、投递趋势监控、笔试/面试倒计时…… 主题深浅色自动跟随系统，逼格拉满。🎬

---

# 🎓 手把手：从零跑起来（萌新友好版）

别慌，跟着做就行，总共 6 步，10 分钟搞定。

## 第 1 步：👀 确认 / 安装 Node.js

应用要 **Node.js ≥ 20**（作者用的是 v24，稳得很）。

先看看电脑里有没有：

```bash
node -v   # 应该显示 v20 或更高
npm -v    # 应该显示 v10 或更高
```

- ✅ 有且够用 → 直接去「第 2 步」
- ❌ 没有 / 太老 → 挑一个方式装上：

**方式 A：官网安装包（傻瓜式）**
去 [nodejs.org](https://nodejs.org) 下 LTS 版本，一路「下一步」点到底。

**方式 B：nvm（装逼进阶版，能随时切版本）**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# 重开终端后
nvm install 24
nvm use 24
```

装完再跑一遍 `node -v` / `npm -v` 确认，就完事了。✅

---

## 第 2 步：📦 克隆代码 + 进目录

把这个仓库拉下来，然后钻进去：

```bash
# 方式一：HTTPS（最常用）
git clone https://github.com/WessonZZ/Job-Seeker.git
cd Job-Seeker

# 方式二：SSH（HTTPS 连不上 GitHub 时用，需先配好 SSH key）
# git clone git@github.com:WessonZZ/Job-Seeker.git
# cd Job-Seeker
```

> 💡 已经有代码了？直接 `cd` 进去，跳过克隆。
> 💡 不确定进对没？跑 `ls`，看到 `package.json`、`src/`、`electron/` 就对了。

---

## 第 3 步：⚙️ 安装依赖

```bash
npm install
```

会自动装上所有依赖（包括 Electron 桌面壳）。

> ⚠️ 看到这些提示别慌，都是虚惊：
> - `npm warn Unknown project config "electron_mirror"` —— 无害。项目配了 electron 镜像源（GitHub 直连不稳），走 npmmirror 下载。**直接无视。**
> - electron 下载很慢/失败？说明镜像没吃到，手动指定一把：`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install`

---

## 第 4 步：🔑 配置环境变量（.env）【重要！】

应用需要个 `.env` 小本本存配置。**项目里已经有 `.env` 了？那这步跳过。** 没有就新建一个，填这些：

```bash
# ── 数据库（SQLite 本地文件，不用额外装数据库，香）──
DATABASE_URL="file:./dev.db"

# ── LLM 智能解析（简历解析 / 岗位信息提取）──
# 推荐 DeepSeek，便宜好用
LLM_PROVIDER="deepseek"
LLM_MODEL="deepseek-chat"
DEEPSEEK_API_KEY="sk-你的key"

# （可选）想用 Claude 也行，二选一：
# LLM_PROVIDER="anthropic"
# LLM_MODEL="claude-sonnet-5-20251001"
# ANTHROPIC_API_KEY="sk-ant-你的key"
```

### 🪙 怎么搞到 DeepSeek 的 API Key

1. 上 [platform.deepseek.com](https://platform.deepseek.com) 注册
2. 「充值」充个几块钱就够玩了
3. 「API Keys」→ 创建一个 Key
4. 把 `sk-...` 复制进 `.env`

> 💡 **不配 LLM 也能跑！** 记录、浏览、看板都能用；只有「简历解析」「岗位智能提取」这类 AI 功能会罢工。想体验全家桶就配一个。

---

## 第 5 步：🗄️ 初始化数据库

```bash
# 建表（SQLite 文件在 prisma/dev.db）
npm run db:push

# （可选）塞点示例数据，方便看效果
npm run db:seed
```

> 以后改了 `prisma/schema.prisma` 里的模型，重跑 `npm run db:push` 同步就行。

---

## 第 6 步：🚀 启动！

### 方式 A：桌面 App（推荐，不用开浏览器）

```bash
# 第一次跑，先构建生产版（启动最快）
npm run app:build

# 之后日常用，后台启动（终端秒释放）
npm run app:bg
```

「求职助手」窗口就弹出来啦。详见下文「桌面 App 启动」。

### 方式 B：网页模式（开发调试）

```bash
npm run dev
```

浏览器打开 http://localhost:3000 就完事。

---

## 🎉 验证成功？

- 桌面窗口弹出来、能点能操作 → **成了！恭喜入坑** 🎉
- http://localhost:3000 能打开 → **也成了！** 🎉

没成？翻到「常见问题」对号入座。

---

# 🧰 常用命令速查

| 命令 | 作用 |
|------|------|
| `npm run dev` | 网页开发模式（改了自动刷新） |
| `npm run app` | 桌面 App 前台启动（终端看日志） |
| `npm run app:bg` | 桌面 App 后台启动（日常最爱） |
| `npm run app:dev` | 桌面 App 开发模式（热更新） |
| `npm run app:build` | 先构建再启动桌面 App |
| `npm run build` | 生产构建 |
| `npm run start` | 生产服务（网页） |
| `npm run db:push` | 同步数据库结构 |
| `npm run db:seed` | 塞示例数据 |
| `npm run icon` | 重新生成 App 图标（要 Python + PIL） |
| `npx prisma studio` | 可视化看数据库 |

---

# 🖥️ 桌面 App 启动（推荐）

不用开浏览器，一条命令弹出窗口（1440×960）。

| 命令 | 说明 |
|------|------|
| `npm run app` | 前台启动，终端持续刷日志 |
| `npm run app:bg` | **后台启动（日常推荐）**，终端立马释放 |
| `npm run app:dev` | 开发模式，改代码热更新 |
| `npm run app:build` | 先构建再启动，首次/改过代码后用它 |

```bash
# 首次
npm run app:build

# 之后日常
npm run app:bg
```

后台日志在 `/tmp/jobseeker-app.log`，想看最新进展：

```bash
tail -f /tmp/jobseeker-app.log
```

**App 启动后的小心机：**
1. 自动检测 3000 端口有没有服务，有就复用，没有就自己起
2. 优先用生产构建 `next start`（几十毫秒就绪）；没构建就退回 `next dev`
3. 服务就绪 → 弹窗口
4. **单实例保护**：重复启动不会开第二个窗口，会聚焦已有的（防止你手滑开一堆 😅）

**端口被占？** 先释放：

```bash
lsof -i :3000
kill -9 <PID>   # PID 换成上面查到的
```

---

# 🚪 桌面 App 关闭（退出）

> 设计是「关窗口不退出」（持久化）：点红叉只关窗口，App 和服务还在后台默默干活，点 **Dock 图标**随时唤回。想**彻底退出**用这些：

| 操作 | 结果 |
|------|------|
| 点红叉关窗口 | App 继续后台，服务不断 |
| 点 Dock 图标 | 重新开窗口 |
| **Cmd+Q 或菜单「退出求职助手」** | **彻底退出，服务自动关闭** |
| `pkill -f "Electron.app"` | 强行退出，服务也带走 |

> 放心，退出时会自动清理，不会留占用 3000 端口的僵尸进程。👻

---

# 🌐 网页模式运行

想回归原始浏览器？也行：

```bash
npm run dev        # 开发（热更新）
npm run build      # 构建
npm run start      # 生产服务
```

打开 http://localhost:3000。

---

# 🛠️ 开发常用命令

```bash
npm run dev          # 网页开发
npm run app:dev      # 桌面开发（热更新）
npm run app:build    # 改完代码构建 + 启动桌面
npm run db:push      # 改了 prisma schema 后同步
npm run icon         # 换了 src/imgs/icon.jpeg 后重新生成图标
```

---

# 🙋 常见问题（FAQ）

**Q1：`npm run` 总提示 `electron_mirror` 警告？**
无害，忽略。那是让 electron 走镜像源的。

**Q2：App 弹「启动失败」？**
多半是 3000 端口被占。按上面「端口占用」释放后重试，或看日志。

**Q3：改了代码，桌面 App 没反应？**
桌面 App 用的是生产构建（`.next`），改完要 `npm run app:build` 重新构建。想热更新用 `npm run app:dev`。

**Q4：简历解析 / 智能功能不好使？**
检查 `.env` 里有没有 `DEEPSEEK_API_KEY`（或 Anthropic 的）。没配 LLM 那这些 AI 功能就歇菜，其它功能照常。

**Q5：关掉窗口怎么再打开？**
点 Dock 图标就行（App 还活着）。没图标说明彻底退了，重新启动命令。

**Q6：想让「关窗口直接退出」？**
可以改 `electron/main.js` 的 `window-all-closed`，把 macOS 分支也改成 `app.quit()`。

**Q7：数据存哪？**
SQLite 文件 `prisma/dev.db`。删了 = 清空数据（谨慎！）。

**Q8：主题色不对劲 / 不跟随系统？**
App 每次启动都跟随系统深浅色，系统切换时实时变。手动点右上角太阳/月亮只管当前会话。还是不对？多半是残留旧实例/旧构建，`Cmd+Q` 后 `npm run app:bg` 重来。

---

# 🗂️ 目录结构（核心）

```
electron/main.js        # 桌面壳：拉服务、窗口、菜单、持久化、主题跟随
electron/preload.js     # 页面加载前设主题
src/app/                # 页面（Dashboard/资讯/行业/求职历程/爬虫/邮件同步）
src/components/         # 图表组件、侧边栏、主题控制器
src/lib/                # 业务逻辑（prisma、阶段模型、邮箱、爬虫、简历解析）
prisma/                 # 数据模型与数据库
public/pdf.worker.mjs   # pdf.js 渲染简历用的 worker
```

---

# ⚡ 技术栈

- **Next.js 16** + React 19 + TypeScript + Tailwind CSS 4
- **Prisma** + SQLite（数据持久化）
- **Electron**（桌面壳：持久化、单实例、系统主题跟随）
- **pdf.js**（简历预览，文字能选中复制）
- lucide-react 图标、node-cron 定时爬虫、Playwright、IMAP 邮件同步

---

> 💬 用着开心就给个 Star，遇到问题欢迎提 Issue。求职路上，冲鸭！🚀
