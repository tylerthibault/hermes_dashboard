import { AgentEvent } from "@/types/hermes";

type ApprovalCardProps = {
  event: AgentEvent;
  onApprove: (eventId: string) => void;
  onReject: (eventId: string) => void;
  decision?: "approved" | "rejected";
};

export function ApprovalCard({ event, onApprove, onReject, decision }: ApprovalCardProps) {
  const action = typeof event.payload.action === "string" ? event.payload.action : "unknown_action";
  const reason =
    typeof event.payload.reason === "string" ? event.payload.reason : "No reason provided by the agent.";
  const risk = typeof event.payload.riskLevel === "string" ? event.payload.riskLevel : "unknown";
  const resources = Array.isArray(event.payload.resources)
    ? event.payload.resources.filter((entry): entry is string => typeof entry === "string")
    : [];

  return (
    <article className="rounded-xl border border-amber-300/35 bg-amber-500/10 p-3 text-sm text-amber-100">
      <p className="text-[11px] uppercase tracking-[0.16em] text-amber-200/90">Approval Required</p>
      <h4 className="mt-1 font-semibold">{action.replaceAll("_", " ")}</h4>
      <p className="mt-1 text-amber-50/90">{reason}</p>
      <p className="mt-2 text-xs">Risk level: {risk}</p>

      <div className="mt-2">
        <p className="mb-1 text-xs uppercase tracking-wide">Affected resources</p>
        {resources.length > 0 ? (
          <ul className="space-y-1 font-mono text-[11px] text-amber-100/90">
            {resources.map((resource) => (
              <li key={resource} className="truncate rounded border border-amber-200/20 bg-black/20 px-2 py-1">
                {resource}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-amber-200/80">No resource list provided.</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApprove(event.id)}
          disabled={decision !== undefined}
          className="rounded-md border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 transition hover:border-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onReject(event.id)}
          disabled={decision !== undefined}
          className="rounded-md border border-rose-300/40 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-100 transition hover:border-rose-300/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject
        </button>
        {decision ? <span className="text-xs uppercase tracking-wide">Decision: {decision}</span> : null}
      </div>
    </article>
  );
}
