import Link from "next/link";
import {
  STAGE_ORDER,
  STAGE_META,
  STAGE_COLORS,
  STAGE_WEIGHT,
} from "@/lib/application-stages";

export interface CompanyPosition {
  id: string;
  position: string;
  stageIndex: number;
  result?: "rejected" | "ghosted" | null;
}

export interface CompanyProgressItem {
  name: string;
  logo: string | null;
  tint: { from: string; to: string };
  positions: CompanyPosition[];
  /** 点击公司头跳转（该公司全部岗位） */
  href: string;
}

/** 公司 logo：有 logo 显示图片，否则用柔和色调 + 首字母圆形徽标 */
function CompanyLogo({
  name,
  logo,
  tint,
}: {
  name: string;
  logo: string | null;
  tint: { from: string; to: string };
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 公司 logo 多为占位图，避免引入 next/image 远端域名配置
      <img
        src={logo}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-[var(--border)] shrink-0"
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{
        background: `linear-gradient(135deg, ${tint.from} 0%, ${tint.to} 100%)`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      {name.charAt(0)}
    </div>
  );
}

/** 单个岗位的分段进度条 */
function StageBar({ stageIndex }: { stageIndex: number }) {
  return (
    <div className="flex-1 flex gap-1.5">
      {STAGE_ORDER.map((key) => {
        const filled = STAGE_WEIGHT[key] <= stageIndex;
        const c = STAGE_COLORS[key];
        return (
          <div
            key={key}
            className={`h-2.5 rounded-full flex-1 transition-colors ${
              filled ? "" : "bg-[var(--border)]"
            }`}
            style={
              filled
                ? { background: `linear-gradient(90deg, ${c.from} 0%, ${c.to} 100%)` }
                : undefined
            }
            title={STAGE_META[key].label}
          />
        );
      })}
    </div>
  );
}

/**
 * 公司岗位进度：公司分组，细化到每个岗位的进度条。
 * 点击岗位行可跳转到该投递的详情页。
 */
export default function CompanyProgress({
  items,
}: {
  items: CompanyProgressItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--muted)] text-sm">
        暂无投递记录
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {items.map((company) => (
        <div key={company.name} className="py-2">
          {/* 公司头（可点击跳转该公司岗位） */}
          <Link
            href={company.href}
            className="flex items-center gap-3 py-1 group"
            title="查看该公司的全部投递"
          >
            <CompanyLogo name={company.name} logo={company.logo} tint={company.tint} />
            <span className="text-sm font-semibold group-hover:text-[var(--primary)] transition-colors">
              {company.name}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {company.positions.length} 个岗位
            </span>
          </Link>

          {/* 岗位列表 */}
          <div className="ml-11 mt-1 space-y-0.5">
            {company.positions.map((pos) => {
              const meta =
                pos.stageIndex > 0
                  ? STAGE_META[STAGE_ORDER[pos.stageIndex - 1] ?? "applied"]
                  : { label: "待投递" };
              const reached =
                STAGE_ORDER.slice(0, pos.stageIndex)
                  .map((k) => STAGE_META[k].label)
                  .join(" → ") || "待投递";
              const isRejected = pos.result === "rejected";
              const isGhosted = pos.result === "ghosted";
              return (
                <Link
                  key={pos.id}
                  href={`/journey/applications/${pos.id}`}
                  className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-[var(--sidebar-hover)] group relative"
                  title={pos.position}
                >
                  <div className="chart-tooltip chart-tooltip--stacked">
                    <div className="font-semibold">
                      {company.name} · {pos.position}
                    </div>
                    <div className="mt-0.5 text-[var(--background)]/80">
                      进度：{reached}
                      {isRejected ? " · 结果：被拒" : isGhosted ? " · 结果：无回应" : ""}
                    </div>
                  </div>
                  <span className="w-48 min-w-0 shrink-0 text-sm text-[var(--muted)] truncate group-hover:text-[var(--primary)] transition-colors">
                    {pos.position}
                  </span>
                  <StageBar stageIndex={pos.stageIndex} />
                  {isRejected || isGhosted ? (
                    <span className={`w-16 shrink-0 text-right text-[11px] font-medium ${isRejected ? "text-red-500" : "text-[var(--muted)]"}`}>
                      {isRejected ? "被拒" : "无回应"}
                    </span>
                  ) : (
                    <span className="w-16 shrink-0 text-right text-xs text-[var(--muted)]">
                      {meta.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
