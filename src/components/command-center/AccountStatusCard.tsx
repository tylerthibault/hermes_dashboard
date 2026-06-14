import { ConnectedAccount, UsageLimit } from "@/types/hermes";

type AccountStatusCardProps = {
  title: string;
  account?: ConnectedAccount;
  usage?: UsageLimit;
};

const statusTone: Record<NonNullable<ConnectedAccount["status"]>, string> = {
  connected: "text-emerald-200 border-emerald-300/30 bg-emerald-500/10",
  disconnected: "text-zinc-300 border-zinc-400/20 bg-zinc-500/10",
  error: "text-rose-200 border-rose-300/30 bg-rose-500/10",
  partial: "text-amber-200 border-amber-300/30 bg-amber-500/10",
};

export function AccountStatusCard({ title, account, usage }: AccountStatusCardProps) {
  const status = account?.status ?? "disconnected";

  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink-100">{title}</h4>
        <span className={`rounded-md border px-2 py-0.5 text-[11px] uppercase tracking-wide ${statusTone[status]}`}>
          {status}
        </span>
      </div>

      <p className="text-xs text-ink-300">{account?.accountName ?? "No account connected"}</p>

      {usage ? (
        <div className="mt-2 space-y-1 text-xs text-ink-300">
          <p>Kind: {usage.kind.replaceAll("_", " ")}</p>
          {typeof usage.remaining === "number" && typeof usage.limit === "number" ? (
            <p>
              Remaining: {usage.remaining} / {usage.limit} {usage.unit ?? "units"}
            </p>
          ) : null}
          {usage.resetAt ? <p>Reset: {new Date(usage.resetAt).toLocaleTimeString()}</p> : null}
          {typeof usage.metadata?.message === "string" ? <p>{usage.metadata.message}</p> : null}
          <p className="text-[11px] text-ink-500">Last checked: {new Date(usage.checkedAt).toLocaleTimeString()}</p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-500">Usage details unavailable.</p>
      )}
    </article>
  );
}
