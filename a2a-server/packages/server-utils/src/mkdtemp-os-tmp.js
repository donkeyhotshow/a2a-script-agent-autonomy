import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
/** Create a directory under the OS temp dir; `prefix` must be suitable for `fs.mkdtemp` (e.g. `a2a-foo-`). */
export async function mkdtempOsTmp(prefix) {
    return mkdtemp(path.join(tmpdir(), prefix));
}
//# sourceMappingURL=mkdtemp-os-tmp.js.map