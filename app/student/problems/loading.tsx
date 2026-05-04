import { Skeleton } from '@/components/ui/Skeleton'

export default function ProblemsLoading() {
  return (
    <div className="loading-delay">
      <div className="mb-6 space-y-3">
        <Skeleton className="h-9 w-44 rounded-xl" />
        <Skeleton className="h-4 w-40 rounded-lg" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  )
}
