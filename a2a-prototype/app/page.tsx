import { Suspense } from "react";
import AgentConsole from "@/components/AgentConsole";

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono text-sm">Loading…</div>}>
      <AgentConsole />
    </Suspense>
  );
}

