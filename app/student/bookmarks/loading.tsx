import { Skeleton } from '@/components/ui/Skeleton'

export default function BookmarksLoading() {
  return (
    <div className="loading-delay">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-4 w-36 rounded-lg" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
      </div>

      <Skeleton className="h-[420px]" />
    </div>
  )
}
