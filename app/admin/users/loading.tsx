import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminUsersLoading() {
  return (
    <div className="loading-delay">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
      </div>

      <div className="c-card rounded-2xl overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-white/5 last:border-0">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
