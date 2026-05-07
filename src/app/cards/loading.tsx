import { ResultsGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="surface p-5">
        <div className="skeleton h-7 w-32" />
        <div className="mt-3 skeleton h-4 w-2/3" />
        <div className="mt-4 skeleton h-11 w-full" />
      </div>
      <ResultsGridSkeleton />
    </div>
  );
}
