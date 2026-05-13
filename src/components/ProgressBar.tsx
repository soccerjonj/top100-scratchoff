export function ProgressBar({
  watched,
  total,
}: {
  watched: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((watched / total) * 100);
  return (
    <div className="flex items-center gap-4">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-sm tabular-nums">
        <span className="text-gold font-semibold">{watched}</span>
        <span className="text-zinc-500"> / {total}</span>
        <span className="ml-2 text-zinc-500">({pct}%)</span>
      </div>
    </div>
  );
}
