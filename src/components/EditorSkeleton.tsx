import { Skeleton } from "@/components/ui/skeleton";

/** Lightweight skeleton matching the QuizEditor layout for instant paint. */
export function EditorSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </section>
      <section>
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </section>
    </div>
  );
}
