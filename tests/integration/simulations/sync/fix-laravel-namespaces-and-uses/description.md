# Fix Laravel namespaces and `use` statements

## Type

**Actions** — synchronous `execute.script` chain, then **`execute-command`** for Composer ([`SCHEMA.md`](../SCHEMA.md)
action-key shape). Full multi-phase scripted pattern (Vue-centric central golden): **`sync/script`**
([`../script/description.md`](../script/description.md)).

## Flow

| Step | `execution.step`                        | Client runs                                                        |
|------|-----------------------------------------|--------------------------------------------------------------------|
| 1    | `router`                                | `execute.form` — pick `fix-laravel-namespaces-and-uses`            |
| 2    | `laravel-use-detect`                    | script → `broken_uses[]`                                           |
| 3    | `laravel-use-resolve`                   | script → `patches[]`                                               |
| 4    | `laravel-use-apply`                     | script → `fixed_files[]`                                           |
| 5    | `laravel-composer-autoload`             | `execute-command`: `composer dump-autoload -o`                     |
| 6    | `laravel-composer-autoload` (completed) | — (summary `result.script`: `cleanup_count`, `composer_exit_code`) |

## Server

- Action MD: [
  `a2a-server/src/actions/definitions/fix-laravel-namespaces-and-uses.md`](../../a2a-server/src/actions/definitions/fix-laravel-namespaces-and-uses.md)
- Transforms: `a2a-server/prompts/transforms/fix-laravel-namespaces-and-uses-*-request.json`

## Fixture paths (websitestore layout)

Examples use `features/business/<feature>/app/...` (e.g. `CheckoutApiController.php`, `ProfileController.php`,
`payments/.../PaymentController.php`) and `App\Features\Business\...` FQCNs.

## Related scripts (websitestore.com.ua)

Under `websitestore.com.ua/scripts/`: `detect/detect_invalid_namespaces.php`,
`detect/detect_invalid_use_statements.php`, `detect/generate_use_fixes.php`, `detect/apply_use_fixes.php`,
`fix_use_statements.php`, `find_invalid_use_statements.php`, `fix-use-statements.js`,
`fix-migrations-use-statements.ps1`.

## Regenerate step JSON

```bash
node simulations/fix-laravel-namespaces-and-uses/_gen-steps.mjs
```
