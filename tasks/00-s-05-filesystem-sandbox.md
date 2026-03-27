# S-05: Server Filesystem Sandbox

## Status
- [ ] Open

## Description
Freeze cwd/tmp/home allowlist policy for file actions and expose clear error messages.

## Details
- Зафиксировать allowlist policy для файловых действий: cwd/tmp/home
- Expose clear error messages
- Обеспечить безопасность

## Source
- [a2a-server/DEV_STATE.md:173](../a2a-server/DEV_STATE.md)

## Owner
a2a-server security

## Verification
- Policy зафиксирована
- Error messages clear
- Sandboxing работает