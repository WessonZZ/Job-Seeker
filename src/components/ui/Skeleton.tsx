/** 加载占位块。App Router 在服务端组件 resolve 之前什么都不渲染，骨架屏用来填补这段空白。 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-[var(--sidebar-hover)] ${className}`}
    />
  );
}
