'use client';
import { useEffect, useState, type FC } from 'react';

interface AgentCapability {
  name: string;
  description?: string;
}

interface AgentEndpoint {
  name: string;
  url: string;
  method?: string;
}

interface AgentSafetyPolicy {
  id: string;
  description: string;
}

interface AgentCardData {
  name?: string;
  version?: string;
  description?: string;
  capabilities?: AgentCapability[];
  endpoints?: AgentEndpoint[];
  safety_policies?: AgentSafetyPolicy[];
  [key: string]: unknown;
}

const AgentCard: FC = () => {
  const [data, setData] = useState<AgentCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // NEXT_PUBLIC_* vars are available on the client-side via process.env
  const apiBase = process.env.NEXT_PUBLIC_A2A_API_URL ?? '';
  const agentCardUrl = `${apiBase}/.well-known/agent.json`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(agentCardUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<AgentCardData>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load agent card');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [agentCardUrl]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(agentCardUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* silently ignore */ });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-1/3" />
        <div className="h-3 bg-zinc-800 rounded w-2/3" />
        <div className="h-3 bg-zinc-800 rounded w-1/2" />
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-400 text-xs font-mono">Failed to load agent card: {error}</p>
        <p className="text-zinc-500 text-xs mt-1 font-mono">{agentCardUrl}</p>
      </div>
    );
  }

  const capabilities: AgentCapability[] = Array.isArray(data?.capabilities) ? data.capabilities : [];
  const endpoints: AgentEndpoint[] = Array.isArray(data?.endpoints) ? data.endpoints : [];
  const policies: AgentSafetyPolicy[] = Array.isArray(data?.safety_policies) ? data.safety_policies : [];

  return (
    <div className="p-4 space-y-4 overflow-auto text-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-zinc-200 font-mono font-semibold">{data?.name ?? 'Agent'}</p>
          {data?.version && (
            <span className="text-xs text-zinc-500 font-mono">v{data.version}</span>
          )}
          {data?.description && (
            <p className="text-zinc-400 text-xs mt-1">{data.description}</p>
          )}
        </div>
        <button
          onClick={handleCopyUrl}
          className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 transition-colors font-mono"
        >
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
      </div>

      {/* Capability badges */}
      {capabilities.length > 0 && (
        <div>
          <p className="text-zinc-500 text-xs font-mono mb-2">Capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {capabilities.map((cap) => (
              <span
                key={cap.name}
                title={cap.description}
                className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 text-xs font-mono border border-blue-800"
              >
                {cap.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Endpoints table */}
      {endpoints.length > 0 && (
        <div>
          <p className="text-zinc-500 text-xs font-mono mb-2">Endpoints</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-600 font-mono">
                <th className="text-left pr-3 pb-1">Method</th>
                <th className="text-left pr-3 pb-1">Name</th>
                <th className="text-left pb-1">URL</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep) => (
                <tr key={ep.url} className="border-t border-zinc-800">
                  <td className="pr-3 py-1 text-zinc-500 font-mono">{ep.method ?? 'GET'}</td>
                  <td className="pr-3 py-1 text-zinc-300">{ep.name}</td>
                  <td className="py-1 text-zinc-400 font-mono break-all">{ep.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Safety policies list */}
      {policies.length > 0 && (
        <div>
          <p className="text-zinc-500 text-xs font-mono mb-2">Safety Policies</p>
          <ul className="space-y-1">
            {policies.map((p) => (
              <li key={p.id} className="flex items-start gap-2">
                <span className="text-zinc-500 font-mono text-xs shrink-0">{p.id}</span>
                <span className="text-zinc-300 text-xs">{p.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {capabilities.length === 0 && endpoints.length === 0 && policies.length === 0 && (
        <p className="text-zinc-600 text-xs font-mono">No structured data available.</p>
      )}
    </div>
  );
};

export default AgentCard;
