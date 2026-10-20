"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type ToastFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastFn | null>(null);

/** 无 Provider 时退化成 no-op，避免整页崩掉 */
const noop: ToastFn = () => {};

export function useToast(): ToastFn {
  return useContext(ToastContext) ?? noop;
}

const STYLES: Record<ToastKind, { icon: ReactNode; ring: string }> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    ring: "border-emerald-500/30",
  },
  error: {
    icon: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
    ring: "border-red-500/30",
  },
  info: {
    icon: <Info className="w-4 h-4 text-[var(--primary)] shrink-0" />,
    ring: "border-[var(--border)]",
  },
};

const AUTO_DISMISS_MS = 3500;

/**
 * 轻量全局提示。
 *
 * 之前项目里没有任何操作反馈：删除成功后列表里那一行无声消失，
 * 用户分不清是删成功了还是页面出错了；正向反馈（保存成功、复制成功）更是完全没有。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    (message, kind = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--card)] border shadow-lg text-sm min-w-[240px] max-w-sm ${STYLES[t.kind].ring}`}
          >
            {STYLES[t.kind].icon}
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="关闭提示"
              className="shrink-0 p-0.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
