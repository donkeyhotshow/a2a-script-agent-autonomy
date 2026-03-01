{
  "action": "write-file",
  "path": "docs/auth-analysis.md",
  "content": "# Аналіз системи авторизації\n\n## Огляд\n\nСистема авторизації в проекті побудована на JWT токенах.\n\n## Компоненти\n\n### 1. Middleware\n**Файл:** `src/middleware/auth.js`\n\n`authMiddleware` - перевіряє JWT токен з заголовку Authorization:\n- Якщо токен відсутній - повертає 401\n- Якщо токен невалідний - повертає 401\n- Якщо токен валідний - додає user до req та викликає next()\n\n### 2. Сервіс\n**Файл:** `src/services/auth.js`\n\n`AuthService` надає методи:\n- **login(credentials)** - аутентифікація користувача\n- **validateToken(token)** - валідація токену\n- **refreshToken(oldToken)** - оновлення токену\n\n### 3. Routes\n**Файл:** `src/routes/auth.js`\n\nЕндпоінти:\n- `POST /login` - вхід\n- `POST /refresh` - оновлення токену\n- `POST /logout` - вихід\n\n## Потік авторизації\n\n1. Клієнт відправляє POST /login з email/password\n2. AuthService перевіряє credentials та генерує JWT\n3. Клієнт отримує токен\n4. Для захищених роутів - відправляє токен в заголовку\n5. authMiddleware перевіряє токен\n"
}
```
