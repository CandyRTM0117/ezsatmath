import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminExamsLoading() {
  return (
    <div className="loading-delay">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-white/5 last:border-0">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
