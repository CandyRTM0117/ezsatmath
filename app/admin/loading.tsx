import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminLoading() {
  return (
    <div className="loading-delay">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <Skeleton className="h-[480px]" />
    </div>
  )
}
