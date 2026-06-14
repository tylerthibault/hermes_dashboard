import { ReactNode } from "react";

type AppShellProps = {
  topBar: ReactNode;
  leftSidebar: ReactNode;
  centerPanel: ReactNode;
  rightSidebar: ReactNode;
};

export function AppShell({ topBar, leftSidebar, centerPanel, rightSidebar }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-obsidian text-ink-100">
      <div className="pointer-events-none absolute inset-0 bg-grid-overlay opacity-35" />
      <div className="scanline-overlay pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(41,192,255,0.12),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(243,178,74,0.1),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_20deg_at_78%_22%,rgba(66,204,255,0.08),transparent_40%,transparent_60%,rgba(66,204,255,0.08))] opacity-55" />
      <div className="relative z-10 flex min-h-screen flex-col">
        {topBar}
        <div className="flex min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-2 md:px-4 md:pb-4">
          <aside className="hidden w-[320px] shrink-0 md:block">{leftSidebar}</aside>
          <main className="min-w-0 flex-1 px-0 md:px-3">{centerPanel}</main>
          <aside className="hidden w-[340px] shrink-0 xl:block">{rightSidebar}</aside>
        </div>
      </div>
    </div>
  );
}
