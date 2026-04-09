import type { LoadedSession, SessionIndex, StepArtifacts } from './types';

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Files from `<input webkitdirectory>` or drag-drop: `path` is webkitRelativePath or name.
 */
export function loadSessionFromFileList(
  files: Array<{ path: string; text: string }>
): LoadedSession | null {
  let indexRaw: string | null = null;
  let indexPath = '';
  const stepFiles = new Map<string, string>();

  for (const f of files) {
    const p = f.path.replace(/\\/g, '/');
    if (p.endsWith('session-index.json')) {
      indexRaw = f.text;
      indexPath = p;
    } else {
      stepFiles.set(p, f.text);
    }
  }

  if (!indexRaw) return null;
  const index = parseJson<SessionIndex>(indexRaw);
  if (!index) return null;

  const sid =
    index.sessionId ||
    indexPath.replace(/\/session-index\.json$/, '').split('/').pop() ||
    'unknown-session';

  const steps = new Map<number, StepArtifacts>();

  const stepRe = /\/(\d+)\/(server-response|client-result|messages|request-to-server|server-promise)\.json$/;

  for (const [p, text] of stepFiles) {
    const m = p.match(stepRe);
    if (!m) continue;
    const stepNum = parseInt(m[1], 10);
    const kind = m[2];
    let art = steps.get(stepNum);
    if (!art) {
      art = { step: stepNum };
      steps.set(stepNum, art);
    }
    if (kind === 'server-response') {
      art.serverResponse = parseJson(text);
    } else if (kind === 'client-result') {
      art.clientResult = parseJson(text);
    } else if (kind === 'messages') {
      art.messages = parseJson(text);
    } else if (kind === 'request-to-server') {
      art.requestToServer = parseJson(text);
    } else if (kind === 'server-promise') {
      art.serverPromise = parseJson(text);
    }
  }

  return { sessionId: sid, index, steps };
}

export async function readFileListAsTexts(fileList: FileList): Promise<
  Array<{ path: string; text: string }>
> {
  const out: Array<{ path: string; text: string }> = [];
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    const path =
      (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    if (!path.endsWith('.json')) continue;
    const text = await f.text();
    out.push({ path, text });
  }
  return out;
}
