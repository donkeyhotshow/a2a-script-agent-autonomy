import type { Edge, Node } from '@vue-flow/core';
import type { LoadedSession } from './types';
import { summarizeStepTitle } from './summarizeStep';

const NODE_X = 80;
const NODE_Y_GAP = 140;

export function buildGraphFromSession(
  loaded: LoadedSession,
  opts?: { indexMeta?: boolean }
): { nodes: Node[]; edges: Edge[] } {
  const index = loaded.index;
  const stepMeta = new Map<number, { hasServerResponse?: boolean; hasClientResult?: boolean }>();
  for (const s of index.steps || []) {
    stepMeta.set(s.step, {
      hasServerResponse: s.hasServerResponse,
      hasClientResult: s.hasClientResult,
    });
  }

  const stepSet = new Set<number>();
  for (const k of loaded.steps.keys()) stepSet.add(k);
  for (const s of index.steps || []) stepSet.add(s.step);
  if (typeof index.currentStep === 'number') stepSet.add(index.currentStep);
  const stepNums = Array.from(stepSet).sort((a, b) => a - b);

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let metaY = 0;
  if (opts?.indexMeta !== false) {
    const lines = [
      `session: ${loaded.sessionId}`,
      index.mode ? `mode: ${index.mode}` : '',
      index.status ? `status: ${index.status}` : '',
      index.promiseId ? `promiseId: ${index.promiseId}` : '',
      index.promiseStatus ? `promiseStatus: ${index.promiseStatus}` : '',
      index.currentStep != null ? `currentStep: ${index.currentStep}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    nodes.push({
      id: 'meta',
      type: 'default',
      position: { x: NODE_X, y: metaY },
      data: {
        label: 'Session index',
        detail: lines,
      },
      style: {
        width: '320px',
        fontSize: '11px',
        fontFamily: 'ui-monospace, monospace',
        whiteSpace: 'pre-wrap',
      },
    });
    metaY += 100;
  }

  let prevId = opts?.indexMeta !== false ? 'meta' : null;
  let y = metaY;

  for (const n of stepNums) {
    const art = loaded.steps.get(n);
    const meta = stepMeta.get(n);
    const id = `step-${n}`;
    const title = art ? summarizeStepTitle(art) : '(no step files)';
    const flags = [
      meta?.hasServerResponse ? 'SR' : '—',
      meta?.hasClientResult ? 'CR' : '—',
    ].join(' / ');

    const label = `#${n}  [${flags}]\n${title}`;

    nodes.push({
      id,
      type: 'default',
      position: { x: NODE_X, y },
      data: {
        label,
        stepNum: n,
        detail: art ? undefined : 'Load step JSON files for full detail.',
      },
      style: {
        width: '340px',
        fontSize: '12px',
        fontFamily: 'system-ui, sans-serif',
        whiteSpace: 'pre-wrap',
      },
    });

    if (prevId) {
      edges.push({
        id: `e-${prevId}-${id}`,
        source: prevId,
        target: id,
        animated: true,
      });
    }
    prevId = id;
    y += NODE_Y_GAP;
  }

  return { nodes, edges };
}
