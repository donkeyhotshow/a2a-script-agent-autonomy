import { Suspense } from "react";
import AgentConsole from "@/components/AgentConsole";

export default function Home() {
  return (
    <Suspense fallback={
      <div role="status" aria-live="polite" className="h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 font-mono text-sm">Loading…</p>
      </div>
    }>
      <AgentConsole />
    </Suspense>
  );
}

