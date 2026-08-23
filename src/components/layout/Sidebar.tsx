"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Newspaper,
  Building2,
  BriefcaseBusiness,
  Bot,
  Mail,
  Settings,
} from "lucide-react";

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "概览",
    items: [{ href: "/", label: "总览", icon: LayoutDashboard }],
  },
  {
    label: "求职追踪",
    items: [
      { href: "/news", label: "每日资讯", icon: Newspaper },
      { href: "/industries", label: "行业岗位", icon: Building2 },
    ],
  },
  {
    label: "求职历程",
    items: [
      {
        href: "/journey",
        label: "历程总览",
        icon: BriefcaseBusiness,
        children: [
          { href: "/journey/applications", label: "投递记录" },
          { href: "/journey/profile", label: "个人信息" },
          { href: "/journey/analytics", label: "数据分析" },
          { href: "/journey/calendar", label: "面试日历" },
        ],
      },
    ],
  },
  {
    label: "工具",
    items: [
      { href: "/scraper", label: "爬虫管理", icon: Bot },
      { href: "/journey/email-sync", label: "邮件同步", icon: Mail },
    ],
  },
  {
    label: "系统",
    items: [{ href: "/settings", label: "设置", icon: Settings }],
  },
];

const MIN_WIDTH = 110;
const MAX_WIDTH = 320;
const DEFAULT_WIDTH = 150;
const COLLAPSED_WIDTH = 64;
const WIDTH_KEY = "jobseeker-sidebar-width";

/** 品牌标识：青绿渐变圆角方块 + "成长阶梯"（投递 → Offer 的三级跃升） */
function BrandLogo() {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
      style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)" }}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor" aria-hidden>
        <rect x="2" y="14" width="5" height="6" rx="1" />
        <rect x="9.5" y="10" width="5" height="10" rx="1" opacity="0.82" />
        <rect x="17" y="5" width="5" height="15" rx="1" opacity="0.62" />
      </svg>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("/journey");
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
      className={`relative flex flex-col border-r border-[var(--border)] bg-[var(--sidebar)] backdrop-blur-xl ${
        isResizing ? "" : "transition-[width] duration-200"
      }`}
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-[var(--border)]">
        <BrandLogo />
        {!collapsed && (
          <span className="font-semibold text-[15px] whitespace-nowrap tracking-tight">
            求职助手
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <p className="px-3 mt-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]/75 leading-none">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
          const Icon = item.icon;
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
                    setExpandedSection(isExpanded ? null : item.href);
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {hasChildren && (
                      <ChevronRight
                        className={`w-4 h-4 ml-auto transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        strokeWidth={1.8}
                      />
                    )}
                  </>
                )}
              </Link>

              {/* Submenu */}
              {!collapsed && hasChildren && isExpanded && (
                <div className="ml-[21px] mt-1 space-y-0.5 border-l border-[var(--border)] pl-2">
                  {item.children!.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
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
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
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