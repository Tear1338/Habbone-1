export default function BoutiqueLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-5 py-4">
        <div className="h-[45px] w-[45px] animate-pulse rounded bg-white/10" />
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-[8px] border border-[#141433] bg-[#1F1F3E] overflow-hidden">
            <div className="h-[140px] bg-[#303060]" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="h-8 w-24 rounded bg-white/5" />
              <div className="h-10 w-full rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
