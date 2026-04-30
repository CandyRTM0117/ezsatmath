import { Skeleton } from '@/components/ui/Skeleton'

export default function StudentLoading() {
  return (
    <div className="fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-72 rounded-xl" />
        <Skeleton className="h-4 w-48 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}
