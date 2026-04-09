# TICKET-0001: Framework detector service migration

## Context
Deprecate the legacy `FrameworkExtractorService`, migrate consumers to the new service, and maintain compatibility until the cutover.

## Sources
- `a2a-server/docs/ADR/framework-detector-simplification.md`
- `a2a-server/DEV_STATE.md`

## Tasks
- [ ] Annotate legacy `FrameworkExtractorService` as `@deprecated`.
- [ ] Identify all consumers of the legacy service.
- [ ] Migrate each consumer to the new service (interface TBD).
- [ ] Verify functionality with the new service.
- [ ] Remove old code and refresh documentation.

## Status
- **Phase**: Execution
- **State**: In-Progress
