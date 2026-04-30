import { Skeleton } from '@/components/ui/Skeleton'

export default function ExamLoading() {
  return (
    <div className="max-w-2xl fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56 rounded-lg" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>

      <Skeleton className="h-2 w-full rounded-full mb-6" />

      <Skeleton className="h-72 mb-5" />

      <div className="flex gap-3">
        <Skeleton className="h-12 w-28 rounded-full" />
        <Skeleton className="h-12 flex-1 rounded-full" />
      </div>
    </div>
  )
}
