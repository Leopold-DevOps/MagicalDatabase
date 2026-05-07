export function CardTileSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-800/60 bg-ink-900/40">
      <div className="skeleton aspect-[5/7] w-full rounded-none" />
      <div className="space-y-2 px-3 py-2.5">
        <div className="skeleton h-3.5 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ResultsGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="skeleton h-3.5 w-32" />
      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <li key={i}>
            <CardTileSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CardDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="skeleton h-4 w-32" />
      <div className="grid gap-8 md:grid-cols-[minmax(260px,360px)_1fr]">
        <div className="surface overflow-hidden">
          <div className="skeleton aspect-[5/7] w-full rounded-none" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <div className="skeleton h-9 w-2/3" />
            <div className="skeleton h-4 w-1/3" />
          </div>
          <div className="surface space-y-3 p-5">
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-20 w-full" />
          </div>
          <div className="surface grid gap-4 p-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
