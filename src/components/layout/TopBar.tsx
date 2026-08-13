"use client";

import { Search, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HeroBadge from "@/components/HeroBadge";

export default function TopBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const theme = document.documentElement.getAttribute("data-theme");
// eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载/联动时的一次性 setState，属合法模式
    setIsDark(theme === "dark");
  }, []);

  const toggleTheme = () => {
    // 手动切换只对本会话生效；下次启动仍跟随系统
    (window as unknown as { __themeManual?: boolean }).__themeManual = true;
    const newTheme = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    setIsDark(!isDark);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="flex items-center gap-3 h-16 px-6 border-b border-[var(--border)] backdrop-blur-xl bg-[var(--sidebar)]">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="搜索公司、职位..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
            />
          </div>
        </form>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors text-[var(--muted)] hover:text-[var(--primary)]"
        title={isDark ? "切换到浅色模式" : "切换到深色模式"}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Profile link */}
      <Link
        href="/journey/profile"
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors"
        title="个人信息"
      >
        <HeroBadge hero="BW" size="sm" />
        <span className="text-sm text-[var(--muted)] hidden sm:inline">个人</span>
      </Link>
    </header>
  );
}
