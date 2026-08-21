"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import HeroBadge, { type HeroKey } from "@/components/HeroBadge";

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  hero: HeroKey;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", hero: "IM" },
  { href: "/news", label: "每日资讯", hero: "SP" },
  { href: "/industries", label: "行业岗位", hero: "CAP" },
  {
    href: "/journey",
    label: "求职历程",
    hero: "HULK",
    children: [
      { href: "/journey/applications", label: "投递记录" },
      { href: "/journey/profile", label: "个人信息" },
      { href: "/journey/analytics", label: "数据分析" },
      { href: "/journey/calendar", label: "面试日历" },
    ],
  },
  { href: "/scraper", label: "爬虫管理", hero: "THOR" },
  { href: "/journey/email-sync", label: "邮件同步", hero: "BP" },
  { href: "/settings", label: "设置", hero: "BW" },
];

const MIN_WIDTH = 110;
const MAX_WIDTH = 320;
const DEFAULT_WIDTH = 150;
const COLLAPSED_WIDTH = 64;
const WIDTH_KEY = "jobseeker-sidebar-width";

/** 复仇者联盟 "A" 标志 */
function AvengersLogo() {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md"
      style={{
        background: "linear-gradient(135deg, #e62429 0%, #f5b301 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(230,36,41,0.4)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M7.5 17.5 L12 6 L16.5 17.5" />
        <path d="M9.3 13.6 L14.7 13.6" />
      </svg>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "/journey"
  );
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // 恢复保存的宽度
  useEffect(() => {
    const saved = localStorage.getItem(WIDTH_KEY);
    if (saved) {
      const n = Number(saved);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载/联动时的一次性 setState，属合法模式
        setWidth(n);
    }
  }, []);

  // 宽度变化时持久化
  useEffect(() => {
    localStorage.setItem(WIDTH_KEY, String(width));
  }, [width]);

  // 拖拽调宽
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      setWidth(Math.min(Math.max(e.clientX, MIN_WIDTH), MAX_WIDTH));
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`relative flex flex-col border-r border-[var(--border)] backdrop-blur-xl bg-[var(--sidebar)] ${
        isResizing ? "" : "transition-[width] duration-200"
      }`}
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-[var(--border)]">
        <AvengersLogo />
        {!collapsed && (
          <span className="font-semibold text-base whitespace-nowrap">
            求职助手
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedSection === item.href;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-[var(--sidebar-active)] text-[var(--primary)] font-medium"
                    : "text-[var(--muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                }`}
                onClick={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    setExpandedSection(
                      isExpanded ? null : item.href
                    );
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <HeroBadge hero={item.hero} size="sm" />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {hasChildren && (
                      <ChevronRight
                        className={`w-4 h-4 ml-auto transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    )}
                  </>
                )}
              </Link>

              {/* Submenu */}
              {!collapsed && hasChildren && isExpanded && (
                <div className="ml-7 mt-1 space-y-1">
                  {item.children!.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          childActive
                            ? "bg-[var(--sidebar-active)] text-[var(--primary)] font-medium"
                            : "text-[var(--muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>

      {/* 拖拽手柄（导航栏右缘） */}
      {!collapsed && (
        <div
          className="group absolute top-0 right-0 bottom-0 w-2 cursor-col-resize z-20"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          title="拖动调整宽度"
        >
          <div className="absolute inset-y-0 right-0 w-[3px] bg-transparent group-hover:bg-[var(--primary)]/30 group-active:bg-[var(--primary)]/50" />
        </div>
      )}
    </aside>
  );
}
