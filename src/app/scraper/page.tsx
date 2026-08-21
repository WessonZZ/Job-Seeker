import ScraperControl from "./ScraperControl";
import Link from "next/link";
import { getLLMStatus } from "@/lib/llm-config";

export default async function ScraperPage() {
  const provider = await getLLMStatus();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">爬虫管理</h1>
        <p className="text-[var(--muted)] mt-1">
          从公司招聘页面导入岗位信息
        </p>
      </div>

      {/* LLM 状态提示 */}
      <div
        className={`p-3 rounded-xl border text-sm ${
          provider.configured
            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{provider.configured ? "🧠" : "⚙️"}</span>
          <div>
            <span className="font-medium">
              {provider.configured
                ? `LLM 模式已开启 (${provider.model})`
                : "关键词匹配模式"}
            </span>
            <p className="text-xs mt-0.5 opacity-80">
              {provider.configured
                ? `使用 ${provider.model} 智能识别和提取岗位信息`
                : <>未配置 LLM。去 <Link href="/settings" className="underline">设置</Link> 页面配置 API Key</>}
            </p>
          </div>
        </div>
      </div>

      {/* 注意事项 */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm space-y-1">
        <p className="font-medium">⚠️ 关于自动爬取的说明</p>
        <p className="text-xs opacity-80">
          字节跳动、腾讯、阿里等大厂的招聘网站使用 JavaScript 动态加载岗位数据，HTML 源码中不包含任何岗位信息。自动爬虫无法从这类网站提取岗位。
        </p>
        <p className="text-xs opacity-80">
          <strong>推荐做法：</strong>在搜索框搜索公司名 → 添加公司 → 快速手动添加岗位（只需输入标题即可）。或者直接通过投递记录录入你要投递的岗位。
        </p>
      </div>

      <ScraperControl />
    </div>
  );
}
