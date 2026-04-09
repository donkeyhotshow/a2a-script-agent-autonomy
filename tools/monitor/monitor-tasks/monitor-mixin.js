/**
 * Copy own enumerable prototype methods from each constructor onto `target` (instance).
 * Later mixins win on name collisions — order in the caller array is significant.
 * @param {Record<string, unknown>} target
 * @param {Array<new () => unknown>} constructors
 */
export function applyMonitorMixins(target, constructors) {
  for (const Ctor of constructors) {
    for (const name of Object.getOwnPropertyNames(Ctor.prototype)) {
      if (name !== 'constructor') {
        target[name] = Ctor.prototype[name];
      }
    }
  }
}
