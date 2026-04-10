# PHPUnit deprecations

## Type

**Actions** — router → `phpunit-deprecations` action; chain of `execute.script` steps with action-key `result`
payloads (`scan-phpunit`, deprecation detection, report).

## Flow

See [`analysis.md`](./analysis.md) for the full step-by-step workflow and sub-actions.

## Related

- Server action and transforms follow the usual invoke contract (`context.execution`, single-key `execute` / `result`
  per step); align golden files with [`../SCHEMA.md`](../SCHEMA.md).
