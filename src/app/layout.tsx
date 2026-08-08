import type { Metadata } from "next";
import "../globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import ThemeController from "@/components/layout/ThemeController";

export const metadata: Metadata = {
  title: "求职助手 - 秋招/实习求职记录",
  description: "系统化记录和管理你的秋招/实习求职全流程",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 每次启动都跟随系统深浅色
                  var mq = window.matchMedia('(prefers-color-scheme: dark)');
                  window.__themeManual = false;
                  function apply(theme) {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                  apply(mq.matches ? 'dark' : 'light');
                  // 系统深浅色变化时实时跟随（本会话未手动切换时）
                  mq.addEventListener('change', function(e) {
                    if (!window.__themeManual) apply(e.matches ? 'dark' : 'light');
                  });
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="h-screen flex overflow-hidden">
        <ThemeController />
        <div className="bg-halftone" />
        <div className="bg-energy" />
        <div className="bg-vignette" />
        <div className="bg-a-watermark" />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
