export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando">
      <div className="skeleton h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-24" />)}</div>
      <div className="skeleton h-64" />
    </div>
  );
}
