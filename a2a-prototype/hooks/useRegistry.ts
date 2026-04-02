'use client';
/**
 * useRegistry — ADR-0058/0059: Dynamic Agent Registry UI hook
 *
 * Polls GET /api/registry/health every `intervalMs` ms and returns a live
 * RegistryHealthSummary so UI components (RegistryBadge) can display the
 * current online/draining/total counts without managing their own timers.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types (mirror server RegistryHealthSummary) ───────────────────────────────

export type AgentHealth = 'online' | 'draining' | 'offline';

export interface AgentDetail {
  health: AgentHealth;
  load: number;
  heartbeat: number;
  caps: string[];
}

export interface RegistryHealthSummary {
  online: number;
  draining: number;
  offline: number;
  total: number;
  agents: Record<string, AgentDetail>;
}

export interface UseRegistryHealthResult {
  health: RegistryHealthSummary | null;
  loading: boolean;
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const DEFAULT_INTERVAL_MS = 15_000;

const EMPTY_HEALTH: RegistryHealthSummary = {
  online: 0,
  draining: 0,
  offline: 0,
  total: 0,
  agents: {},
};

export function useRegistryHealth(
  baseUrl = '',
  intervalMs = DEFAULT_INTERVAL_MS,
): UseRegistryHealthResult {
  const [health, setHealth] = useState<RegistryHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/registry/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { success: boolean } & RegistryHealthSummary;
      setHealth({
        online: data.online ?? 0,
        draining: data.draining ?? 0,
        offline: data.offline ?? 0,
        total: data.total ?? 0,
        agents: data.agents ?? {},
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Keep previous health data on error so the badge doesn't flash empty
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    void fetchHealth();
    timerRef.current = setInterval(() => void fetchHealth(), intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchHealth, intervalMs]);

  return { health: health ?? EMPTY_HEALTH, loading, error, refresh: fetchHealth };
}
