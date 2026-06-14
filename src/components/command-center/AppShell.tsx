import { ReactNode } from "react";

type AppShellProps = {
  topBar: ReactNode;
  leftSidebar: ReactNode;
  centerPanel: ReactNode;
  rightSidebar: ReactNode;
};

export function AppShell({ topBar, leftSidebar, centerPanel, rightSidebar }: AppShellProps) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-obsidian text-ink-100">
      <div className="pointer-events-none absolute inset-0 bg-grid-overlay opacity-35" />
      <div className="scanline-overlay pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(41,192,255,0.12),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(243,178,74,0.1),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_20deg_at_78%_22%,rgba(66,204,255,0.08),transparent_40%,transparent_60%,rgba(66,204,255,0.08))] opacity-55" />
      <div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
        {topBar}
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden px-3 pb-3 pt-2 md:grid-cols-[auto_minmax(0,1fr)] md:px-4 md:pb-4 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
          <aside className="hidden h-full min-h-0 w-[320px] shrink-0 overflow-hidden md:block">{leftSidebar}</aside>
          <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden px-0 md:px-3">{centerPanel}</main>
          <aside className="hidden h-full min-h-0 w-[340px] shrink-0 overflow-hidden xl:block">{rightSidebar}</aside>
        </div>
      </div>
    </div>
  );
}
