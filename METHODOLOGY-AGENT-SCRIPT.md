# Методология агент-скрипта

Главный метапромпт и обзор рабочих процессов теперь находятся в `methodology/INDEX.md` (≈300 строк).  
Управление запущенным агентом с человека/Cursor через **curl**: `docs/OPERATOR-CURL.md`.

**Пустая очередь:** нет pending / нечего исполнять ⇒ чеклисты и `DEV_STATE` сжать, новую работу найти и вписать — см. `methodology/tasks.md` и `AGENTS.md` (DEV_STATE Protocol).

Дополнительные подробности разделены на:
- `methodology/mode1.md`
- `methodology/mode2.md`
- `methodology/transitions.md`
- `methodology/implementation.md`
- `methodology/tasks.md`
- `methodology/improvements.md`

Для новых сценариев добавляйте файлы в `methodology/`, стараясь держать каждый вспомогательный файл в пределах 100-150 строк.
