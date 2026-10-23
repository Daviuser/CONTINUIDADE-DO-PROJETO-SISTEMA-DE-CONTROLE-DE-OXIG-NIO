export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="space-y-2"><div className="skeleton h-8 w-48" /><div className="skeleton h-4 w-80 max-w-full" /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-[5.5rem]" />)}</div>
      <div className="card p-0">
        <div className="skeleton h-11 rounded-none" />
        {[0, 1, 2, 3, 4].map(i => <div key={i} className="flex gap-4 border-t px-4 py-4"><div className="skeleton h-4 w-1/4" /><div className="skeleton h-4 w-1/5" /><div className="skeleton h-4 flex-1" /></div>)}
      </div>
    </div>
  );
}
