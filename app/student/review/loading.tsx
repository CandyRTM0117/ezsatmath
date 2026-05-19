import { Skeleton } from '@/components/ui/Skeleton'

export default function ReviewLoading() {
  return (
    <div className="loading-delay">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-52 rounded-xl mb-8" />
      <Skeleton className="rounded-2xl" style={{ minHeight: '320px' }} />
      <div className="flex justify-end mt-6">
        <Skeleton className="h-12 w-40 rounded-xl" />
      </div>
    </div>
  )
}
