/**
 * 求职助手 · Electron 桌面壳
 *
 * 启动时自动拉起本地 Next.js 服务（优先生产构建，否则开发模式），
 * 等服务就绪后打开桌面窗口。退出时自动终止服务进程。
 *
 * 用法：
 *   npm run app        # 启动（有 .next 生产构建则用 next start，否则 next dev）
 *   npm run app:dev    # 强制开发模式
 *   npm run app:build  # 先构建生产版本
 */
const { app, BrowserWindow, dialog, Menu, nativeTheme } = require("electron");
const { spawn, spawnSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const DEV = process.env.NODE_ENV === "development";
const PORT = Number(process.env.PORT || 3000);
const APP_URL = `http://localhost:${PORT}`;
const ROOT = path.join(__dirname, "..");
const APP_ICON = path.join(ROOT, "src", "imgs", "icon-rounded.png");

let serverProc = null;
let mainWindow = null;

/* ── 服务探测 ─────────────────────────────── */

function isServerUp() {
  return new Promise((resolve) => {
    const req = http.get(APP_URL, (res) => {
      let body = "";
      res.on("data", (d) => {
        body += d;
        if (body.length > 200000) req.destroy();
      });
      res.on("end", () => resolve(isOurApp(body)));
      res.on("error", () => resolve(false));
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** 判断端口上的响应是否真的来自本应用，避免 3000 被其它服务占用导致打开陌生页面 */
function isOurApp(body) {
  return (
    body.includes("求职助手") ||
    body.includes("秋招/实习求职记录") ||
    body.includes("_next/static")
  );
}

function waitForServer(timeoutMs = 90000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = async () => {
      if (await isServerUp()) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(tick, 500);
    };
    tick();
  });
}

/* ── Next.js 服务 ─────────────────────────── */

function startNextServer() {
  const hasProdBuild = fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"));
  const useProd = !DEV && hasProdBuild;
  const args = useProd ? ["run", "start"] : ["run", "dev"];

  console.log(`[electron] ${useProd ? "生产" : "开发"}模式启动 Next 服务: npm ${args.join(" ")}`);

  serverProc = spawn("npm", args, {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
    // 独立进程组，退出时整组终止（包含 next 子进程）
    detached: true,
  });

  serverProc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  serverProc.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  serverProc.on("error", (err) => {
    console.error("[electron] 启动 Next 服务失败:", err.message);
  });

  return serverProc;
}

function killServer() {
  if (serverProc && !serverProc.killed) {
    if (process.platform === "win32") {
      // Windows 没有进程组，用 taskkill 连子进程一起杀
      try {
        spawnSync("taskkill", ["/pid", String(serverProc.pid), "/T", "/F"]);
      } catch {
        try {
          serverProc.kill();
        } catch {}
      }
    } else {
      // macOS/Linux：杀整个进程组（含 next 子进程）
      try {
        process.kill(-serverProc.pid, "SIGTERM");
      } catch {
        try {
          serverProc.kill("SIGTERM");
        } catch {}
      }
    }
  }
  serverProc = null;
}

/* ── 应用菜单（含退出入口） ───────────────── */

function buildMenu() {
  const template = [
    // macOS 第一个菜单 = 应用菜单
    ...(process.platform === "darwin"
      ? [
          {
            label: "求职助手",
            submenu: [
              { role: "about", label: "关于求职助手" },
              { type: "separator" },
              { role: "hide", label: "隐藏求职助手" },
              { type: "separator" },
              { role: "quit", label: "退出求职助手", accelerator: "Cmd+Q" },
            ],
          },
        ]
      : []),
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "刷新页面" },
        { role: "forceReload", label: "强制刷新" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
      ],
    },
    {
      label: "窗口",
      submenu: [
        { role: "minimize", label: "最小化" },
        { role: "close", label: "关闭窗口" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ── 窗口 ─────────────────────────────────── */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    title: "求职助手",
    icon: APP_ICON,
    backgroundColor: "#0b0b18", // 深色电影风底色，避免白屏闪烁
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"), // 页面加载前设置主题，避免闪烁
    },
  });

  mainWindow.loadURL(APP_URL);

  // 页面加载完成后，按系统外观应用主题（Electron 专用兜底，可靠生效）
  mainWindow.webContents.on("did-finish-load", () => {
    setTimeout(applyNativeTheme, 120);
  });

  // 自愈：页面加载失败（如服务尚未就绪/临时中断）时，确保服务在线后自动重载
  mainWindow.webContents.on("did-fail-load", async (_e, code, desc, _url, isMainFrame) => {
    if (!isMainFrame) return;
    console.error(`[electron] 页面加载失败(${code}: ${desc})，尝试重载...`);
    const ok = await ensureServer();
    if (ok) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.webContents.isLoading()) {
          mainWindow.webContents.reload();
        }
      }, 500);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/* ── 主题跟随系统（Electron 兜底） ─────────── */

/**
 * 按系统外观把 data-theme 写入页面。
 * 尊重用户本会话的手动切换（window.__themeManual）。
 */
function applyNativeTheme() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const dark = nativeTheme.shouldUseDarkColors;
  const theme = dark ? "dark" : "light";
  mainWindow.webContents
    .executeJavaScript(
      `(function(){ if (window.__themeManual) return; document.documentElement.setAttribute('data-theme', '${theme}'); })()`
    )
    .catch(() => {});
}

/* ── 服务保障：确保本地服务在线 ─────────────── */

/** 服务不在线则启动（或复用已启动的进程）并等待就绪 */
async function ensureServer() {
  if (await isServerUp()) return true;
  if (!serverProc) startNextServer();
  return await waitForServer();
}

/** 确保服务在线后打开窗口；失败返回 false */
async function openWindow() {
  const ok = await ensureServer();
  if (!ok) return false;
  createWindow();
  return true;
}

/** 服务健康检查：检测到服务中断则自动重启并刷新窗口 */
let serverWasUp = false;
async function healthCheck() {
  const up = await isServerUp();
  if (serverWasUp && !up) {
    console.error("[electron] 检测到本地服务中断，自动重启并刷新窗口...");
    killServer();
    const ok = await ensureServer();
    if (ok && mainWindow && !mainWindow.webContents.isLoading()) {
      mainWindow.webContents.reload();
    }
  }
  serverWasUp = up;
}

/* ── 生命周期 ─────────────────────────────── */

// 单实例：再次运行 npm run app 时聚焦已有窗口，而不是再开一个
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      // 窗口已关闭（持久化模式）：再次启动应重新打开窗口，而不是无反馈
      openWindow();
    }
  });

  app.whenReady().then(async () => {
    buildMenu();

    // 设置 App 封面图标（Dock 栏）
    if (process.platform === "darwin" && app.dock) {
      try {
        app.dock.setIcon(APP_ICON);
      } catch (e) {
        console.error("[electron] 设置 Dock 图标失败:", e.message);
      }
    }

    // 系统深浅色变化时实时跟随（Electron 兜底）
    nativeTheme.on("updated", applyNativeTheme);

    // 端口已有服务（比如用户先跑过 npm run dev）就直接复用
    if (!(await isServerUp())) {
      startNextServer();
      const ok = await waitForServer();
      if (!ok) {
        dialog.showErrorBox(
          "启动失败",
          "本地服务未能启动，请关闭占用的 3000 端口后重试，或查看终端日志。"
        );
        app.quit();
        return;
      }
    }
    const ok = await openWindow();
    if (!ok) {
      dialog.showErrorBox(
        "启动失败",
        "本地服务未能启动，请关闭占用的 3000 端口后重试，或查看终端日志。"
      );
      app.quit();
    }

    // 每 10 秒健康检查，服务中断自动恢复
    setInterval(healthCheck, 10000);
  });

  app.on("window-all-closed", () => {
    // macOS：关闭窗口不退出应用（持久化），服务继续在后台运行，
    // 点 Dock 图标可重新打开窗口；只有 Cmd+Q 或菜单退出才真正结束。
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  // macOS 点击 Dock 图标重新唤起窗口（服务不在线会自动拉起并刷新）
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openWindow();
    } else {
      const w = BrowserWindow.getAllWindows()[0];
      if (w.isMinimized()) w.restore();
      w.focus();
      // 服务不在线则拉起并刷新窗口（自愈，避免黑屏）
      if (!(await isServerUp())) {
        const ok = await ensureServer();
        if (ok) w.webContents.reload();
      }
    }
  });

  app.on("before-quit", () => {
    killServer();
  });
}
