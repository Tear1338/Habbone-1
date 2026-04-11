export default function PostLoading() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="animate-pulse space-y-4 rounded-[8px] border border-white/5 bg-[#1F1F3E] p-6">
        <div className="h-6 w-48 rounded bg-white/10" />
        <div className="h-4 w-32 rounded bg-white/5" />
        <div className="space-y-2 pt-4">
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-3/4 rounded bg-white/5" />
          <div className="h-4 w-1/2 rounded bg-white/5" />
        </div>
      </div>
    </main>
  );
}
