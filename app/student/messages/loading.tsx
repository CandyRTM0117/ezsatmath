import { Skeleton } from '@/components/ui/Skeleton'

export default function MessagesLoading() {
  return (
    <div className="fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-4 w-56 rounded-lg" />
      </div>
      <div className="flex gap-6 h-[70vh]">
        <div className="w-56 shrink-0 space-y-2">
          <Skeleton className="h-4 w-20 rounded-md mb-4" />
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <Skeleton className="flex-1 rounded-2xl" />
      </div>
    </div>
  )
}
