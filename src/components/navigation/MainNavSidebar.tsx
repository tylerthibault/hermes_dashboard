"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryItems = [
  { label: "Dashboard", href: "/" },
  { label: "Conversations", href: "/conversations" },
];

const secondaryItems = ["Runs", "Accounts", "Mission Log", "System Core"];

export function MainNavSidebar() {
  const pathname = usePathname();

  return (
    <section className="hud-panel flex h-full flex-col rounded-2xl border border-white/10 bg-graphite-900/65 p-3 backdrop-blur-xl">
      <div className="mb-3 border-b border-white/10 pb-3">
        <h2 className="hud-title text-3xl text-cyan-200 text-glow-cyan">HERMES</h2>
        <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-ink-500">Operator Console</p>
      </div>

      <div className="space-y-1.5">
        {primaryItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                active
                  ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-100 shadow-[0_0_14px_rgba(82,216,255,0.2)]"
                  : "border-white/10 bg-black/20 text-ink-300 hover:border-cyan-200/30 hover:text-cyan-100"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cyan-200 status-pulse" : "bg-ink-500"}`} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 space-y-1.5">
        {secondaryItems.map((item) => (
          <div
            key={item}
            className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-sm text-ink-500"
          >
            {item}
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
        <p className="hud-title text-[10px]">System Clearance</p>
        <p className="mt-1 text-sm font-semibold">Level 5</p>
      </div>
    </section>
  );
}
