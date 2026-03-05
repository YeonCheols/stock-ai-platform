export default function AIAnalysisSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-5 w-32 rounded-full bg-slate-200/60" />
        <div className="h-6 w-56 rounded bg-slate-200/60" />
        <div className="h-4 w-full rounded bg-slate-200/50" />
        <div className="h-4 w-5/6 rounded bg-slate-200/50" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/50">
          <div className="mb-3 h-4 w-24 rounded bg-slate-200/60" />
          <div className="space-y-2">
            <div className="h-3 w-5/6 rounded bg-slate-200/50" />
            <div className="h-3 w-4/6 rounded bg-slate-200/50" />
            <div className="h-3 w-3/5 rounded bg-slate-200/50" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/50">
          <div className="mb-3 h-4 w-24 rounded bg-slate-200/60" />
          <div className="space-y-2">
            <div className="h-3 w-5/6 rounded bg-slate-200/50" />
            <div className="h-3 w-4/6 rounded bg-slate-200/50" />
            <div className="h-3 w-3/5 rounded bg-slate-200/50" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-slate-200/60" />
        <div className="h-3 w-full rounded bg-slate-200/50" />
        <div className="h-3 w-5/6 rounded bg-slate-200/50" />
      </div>
    </div>
  );
}
