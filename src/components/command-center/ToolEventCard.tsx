import { useMemo, useState } from "react";
import { AgentEvent } from "@/types/hermes";

type ToolEventCardProps = {
  event: AgentEvent;
};

const toneByEventType: Record<string, string> = {
  "tool.started": "border-cyan-300/30 bg-cyan-500/10 text-cyan-100",
  "tool.output": "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
  "tool.error": "border-rose-300/30 bg-rose-500/10 text-rose-100",
  "run.paused": "border-amber-300/30 bg-amber-500/10 text-amber-100",
  "run.stopped": "border-orange-300/30 bg-orange-500/10 text-orange-100",
  "run.completed": "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
  "run.failed": "border-rose-300/30 bg-rose-500/10 text-rose-100",
};

export function ToolEventCard({ event }: ToolEventCardProps) {
  const [expanded, setExpanded] = useState(false);

  const title = useMemo(() => {
    const payloadTool = typeof event.payload.tool === "string" ? event.payload.tool : undefined;
    return payloadTool ? `${event.type} - ${payloadTool}` : event.type;
  }, [event.payload.tool, event.type]);

  return (
    <article
      className={`hud-panel rounded-xl border px-3 py-2 text-xs ${toneByEventType[event.type] ?? "border-white/15 bg-white/5 text-ink-200"}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="font-semibold uppercase tracking-[0.14em]">{title}</p>
          <p className="font-mono text-[11px] opacity-75">{new Date(event.createdAt).toLocaleTimeString()}</p>
        </div>
        <span className="rounded-md border border-current/30 px-2 py-0.5 text-[11px]">
          {expanded ? "Collapse" : "Expand"}
        </span>
      </button>

      {expanded ? (
        <pre className="mt-2 overflow-x-auto rounded-md border border-white/10 bg-black/35 p-2 font-mono text-[11px] text-ink-200">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      ) : null}
    </article>
  );
}
