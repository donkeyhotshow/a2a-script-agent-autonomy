# CM-07: Enforce Tri-Role Dialogue Contract

## Status
- [ ] Open

## Description
Enforce tri-role dialogue contract (`user`/`assistant`/`system`) across client session storage and Web rendering; `system` messages represent Red Room auto-responses and must be preserved end-to-end.

## Details
- Поддержка трёх ролей: user, assistant, system
- System messages = Red Room auto-responses
- Сохранение без потерь в session storage и Web rendering
- timeline должен поддерживать все три роли

## Source
- [DEV_STATE.md:291](../DEV_STATE.md)

## Owner
Client session storage + Web rendering

## Verification
- Все три роли поддерживаются в storage
- Web UI корректно рендерит system messages
- Тесты на отсутствие потерь проходят