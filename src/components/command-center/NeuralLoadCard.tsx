type NeuralLoadCardProps = { coreA: number; coreB: number; reserve: number };

export function NeuralLoadCard({ coreA, coreB, reserve }: NeuralLoadCardProps) {
  return (
    <article className="hud-panel rounded-xl border border-cyan-300/20 bg-black/25 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="hud-title text-[11px] text-cyan-200">Neural Load</h4>
        <span className="font-mono text-[10px] text-cyan-300/70">Cores</span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-ink-500">Core A</p>
          <div className="mt-1 h-3 w-full overflow-hidden rounded bg-white/5">
            <div style={{ width: `${coreA}%` }} className="h-full bg-cyan-400" />
          </div>
        </div>

        <div>
          <p className="text-xs text-ink-500">Core B</p>
          <div className="mt-1 h-3 w-full overflow-hidden rounded bg-white/5">
            <div style={{ width: `${coreB}%` }} className="h-full bg-blue-400" />
          </div>
        </div>

        <div>
          <p className="text-xs text-ink-500">Reserve</p>
          <div className="mt-1 h-3 w-full overflow-hidden rounded bg-white/5">
            <div style={{ width: `${reserve}%` }} className="h-full bg-emerald-400" />
          </div>
        </div>
      </div>
    </article>
  );
}
