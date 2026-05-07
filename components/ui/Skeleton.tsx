interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`c-skeleton ${className}`}
      style={style}
    />
  )
}

export function Spinner({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-white/10 border-t-blue-400"
      style={{
        width: size,
        height: size,
        animation: 'spin-slow 700ms linear infinite',
      }}
    />
  )
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 fade-in">
      <Spinner size={36} />
      <p className="text-sm font-semibold tracking-wide text-slate-400">{label}</p>
    </div>
  )
}
