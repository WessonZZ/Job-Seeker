import Link from "next/link";
import { STAGE_COLORS } from "@/lib/application-stages";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /** 点击该级跳转的地址（投递记录筛选） */
  href: string;
}

/**
 * 求职转化漏斗：中间对称的梯形漏斗。
 * 每个阶段是一块以中轴对称的梯形色条，宽度随到达人数逐级收窄，
 * 相邻级之间标注转化率。
 */
export default function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const colors =
          STAGE_COLORS[stage.key as keyof typeof STAGE_COLORS] ?? {
            from: "#3b82f6",
            to: "#60a5fa",
          };

        // 梯形：上边缘半宽 ∝ 本级人数，下边缘半宽 ∝ 下一级人数（收窄成漏斗）
        const topHalf = Math.max((stage.count / max) * 50, 1.5);
        const nextCount = i < stages.length - 1 ? stages[i + 1].count : stage.count;
        const botHalf = Math.max((nextCount / max) * 50 * 0.9, 0.5);
        const clip = `polygon(${(50 - topHalf).toFixed(2)}% 0, ${(50 + topHalf).toFixed(2)}% 0, ${(50 + botHalf).toFixed(2)}% 100%, ${(50 - botHalf).toFixed(2)}% 100%)`;

        const conv =
          i > 0 && stages[i - 1].count > 0
            ? Math.round((stage.count / stages[i - 1].count) * 100)
            : null;

        return (
          <Link
            key={stage.key}
            href={stage.href}
            className="group flex items-center gap-3 rounded-lg transition-colors"
            title={`查看该阶段的岗位 →`}
          >
            {/* 标签 */}
            <div className="w-24 shrink-0 flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: colors.from }}
              />
              <div className="leading-tight">
                <div className="text-sm font-medium group-hover:text-[var(--primary)] transition-colors">
                  {stage.label}
                </div>
                <div className="text-xs text-[var(--muted)] tabular-nums">
                  {stage.count} 个
                </div>
              </div>
            </div>

            {/* 对称梯形色条 + 悬停数据提示 */}
            <div className="flex-1 relative">
              <div className="chart-tooltip">
                {stage.label} {stage.count} 个
                {conv !== null ? ` · 转化 ${conv}%` : " · 起点"} · 点击查看
              </div>
              <div
                className="h-10 transition-opacity group-hover:opacity-90 rounded"
                style={{
                  clipPath: clip,
                  background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                }}
              />
            </div>

            {/* 转化率 */}
            <div className="w-12 shrink-0 text-right">
              {conv !== null ? (
                <>
                  <div className="text-sm font-bold tabular-nums text-[var(--primary)]">
                    {conv}%
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">转化</div>
                </>
              ) : (
                <span className="text-xs text-[var(--muted)]">起点</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}