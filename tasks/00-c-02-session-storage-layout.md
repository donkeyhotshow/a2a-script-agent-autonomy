# C-02: Session Storage Layout Formalization

## Status
- [ ] Open

## Description
Formalize step-folder invariants (`client-result`, `request-to-server`, `server-response`, `messages`) and recovery rules, including explicit persistence rules for `system` role messages (Red Room auto-responses).

## Details
- Зафиксировать инварианты папок шагов
- Определить правила восстановления
- Добавить явные правила для system role messages (Red Room auto-responses)
- Обеспечить не-lossy персистентность

## Source
- [a2a-client/DEV_STATE.md:184](../a2a-client/DEV_STATE.md)

## Owner
a2a-client session storage

## Verification
- Инварианты задокументированы
- Recovery rules работают
- System messages сохраняются без потерь