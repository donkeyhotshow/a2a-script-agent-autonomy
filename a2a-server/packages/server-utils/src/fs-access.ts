import * as fs from "node:fs/promises";

export type PathAccessErrorMeta = { filePath: string; code?: string; error: string };

export async function pathIsAccessible(
  filePath: string,
  onNonEnoent?: (meta: PathAccessErrorMeta) => void,
): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT") return false;
    if (code && code !== "ENOENT") {
      onNonEnoent?.({
        filePath,
        code,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return false;
  }
}

export function timestampedBackupPath(fullPath: string): string {
  return `${fullPath}.backup-${Date.now()}`;
}
