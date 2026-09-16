export default function Loading() {
  return (
    <div role="status" className="panel p-8">
      <p className="text-sm text-muted">Loading saved feedback…</p>
      <div className="mt-6 h-36 animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}
