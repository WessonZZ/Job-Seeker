"use client";

import { useEffect } from "react";

/**
 * 主题控制器：水合后按系统深浅色应用主题，并实时跟随系统变化。
 * 与 <head> 内联脚本 / Electron preload 共同兜底，确保 data-theme 始终正确。
 */
export default function ThemeController() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (theme: string) =>
      document.documentElement.setAttribute("data-theme", theme);
    const manual = () =>
      (window as unknown as { __themeManual?: boolean }).__themeManual;

    (window as unknown as { __themeManual?: boolean }).__themeManual = false;
    apply(mq.matches ? "dark" : "light");

    const onChange = (e: MediaQueryListEvent) => {
      if (!manual()) apply(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return null;
}
