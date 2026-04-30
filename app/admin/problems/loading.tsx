import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminProblemsLoading() {
  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-9 w-44 rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-11 w-44 rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-white/5 last:border-0">
            <Skeleton className="h-4 flex-1 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
