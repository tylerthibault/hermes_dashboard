type NeuralLoadCardProps = {
  coreA: number;
  coreB: number;
  reserve: number;
};

export function NeuralLoadCard({ coreA, coreB, reserve }: NeuralLoadCardProps) {
  const capacity = coreA + coreB;

  return (
    <section className="hud-panel rounded-xl border border-cyan-300/25 bg-black/25 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="hud-title text-[11px] text-cyan-200">Neural Load Distribution</h4>
        <span className="font-mono text-[10px] text-cyan-300/75">RADIAL_SYS_01</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-40 w-40 shrink-0">
          <div className="rotate-ring-slow absolute inset-0 rounded-full border border-cyan-400/20 border-t-cyan-300/70 border-r-cyan-300/40" />
          <div className="rotate-ring-reverse absolute inset-2 rounded-full border border-dashed border-cyan-300/25" />
          <div className="rotate-ring-pulse absolute inset-6 rounded-full border-[8px] border-cyan-200/25 border-t-cyan-300 border-r-cyan-300/70" />

          <div className="absolute inset-[42px] flex flex-col items-center justify-center rounded-full border border-white/10 bg-black/55">
            <p className="text-4xl font-semibold leading-none text-cyan-100">{capacity}%</p>
            <p className="hud-title mt-1 text-[10px] text-ink-400">Capacity</p>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3 text-ink-200">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-4 rounded-full bg-cyan-300" />
              Cognitive Core A
            </div>
            <span className="font-semibold">{coreA}%</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-ink-200">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-4 rounded-full bg-blue-300" />
              Processing Sub-B
            </div>
            <span className="font-semibold">{coreB}%</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-ink-400">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-4 rounded-full bg-zinc-600" />
              Idle Reserve
            </div>
            <span className="font-semibold">{reserve}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}
