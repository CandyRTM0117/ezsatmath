import { Skeleton } from '@/components/ui/Skeleton'

export default function SubscriptionLoading() {
  return (
    <div className="loading-delay">
      <div className="mb-10 space-y-3">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 max-w-3xl mx-auto">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}
