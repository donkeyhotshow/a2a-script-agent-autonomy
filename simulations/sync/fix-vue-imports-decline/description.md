# Fix Vue Imports — decline (router + нова задача)

Копія гілки [`fix-vue-imports`](../fix-vue-imports/description.md) до кроку **escalate**, з **третім** варіантом у формі
кроку 4: повернутись до роутера зі збереженим контекстом (`unresolved_imports`, `vue_imports_partial_carryover`).

- **Крок 5:** `result.choice: fix-vue-imports-decline-router` → знову `execute.form` роутера.
- **Крок 6:** користувач надсилає новий `task` (разом із накопиченим `context`) → знову `execute.form` роутера з
  оновленим `context.task`.

Далі можна підключити реальне злиття сесії / історію (поки лише золоті JSON).

Full scripted chain reference: **`sync/script`** ([`../script/description.md`](../script/description.md)).
