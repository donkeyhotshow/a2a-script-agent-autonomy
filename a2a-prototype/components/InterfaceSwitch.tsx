"use client";

import { useMemo } from "react";

const DEFAULT_CLIENT_UI_URL = "http://localhost:5173";

function safeUrl(value: string | null | undefined): string {
  if (!value) return DEFAULT_CLIENT_UI_URL;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_CLIENT_UI_URL;
  return trimmed.replace(/\/+$/, "");
}

export default function InterfaceSwitch() {
  const clientUrl = useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_CLIENT_UI_URL;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("clientUrl");
    const fromEnv = process.env.NEXT_PUBLIC_CLIENT_UI_URL;
    return safeUrl(fromQuery || fromEnv || DEFAULT_CLIENT_UI_URL);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-50 rounded-md border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-200 shadow-lg backdrop-blur">
      <span className="mr-2 text-zinc-400">Interface:</span>
      <button
        type="button"
        className="mr-2 rounded border border-zinc-500 px-2 py-1 text-zinc-300"
        disabled
      >
        Prototype
      </button>
      <a
        href={clientUrl}
        className="rounded border border-cyan-500 px-2 py-1 text-cyan-300 hover:bg-cyan-500/10"
      >
        Client UI
      </a>
    </div>
  );
}

