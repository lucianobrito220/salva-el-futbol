export default function MatchCardSkeleton() {
  return (
    <div className="mb-3 flex overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex-1 py-3.5 pl-4 pr-3">
        <div className="skeleton mb-2 h-4 w-16" />
        <div className="skeleton mb-1.5 h-3.5 w-28" />
        <div className="skeleton mb-2 h-3 w-20" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="flex w-[92px] flex-shrink-0 flex-col items-center justify-center gap-2 border-l-2 border-dashed border-neutral-200 bg-neutral-50 px-2 py-2.5">
        <div className="skeleton h-4 w-12" />
        <div className="skeleton h-6 w-full rounded-lg" />
      </div>
    </div>
  );
}
