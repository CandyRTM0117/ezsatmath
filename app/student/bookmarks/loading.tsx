import { Skeleton } from '@/components/ui/Skeleton'

export default function BookmarksLoading() {
  return (
    <div className="fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-4 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  )
}
