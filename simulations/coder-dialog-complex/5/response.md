## Система авторизації в проекті

Система авторизації складається з трьох основних компонентів:

### 1. Middleware (src/middleware/auth.js)
`authMiddleware` - перевіряє JWT токен з заголовку Authorization:
- Якщо токен відсутній - повертає 401
- Якщо токен невалідний - повертає 401
- Якщо токен валідний - додає user до req та викликає next()

### 2. Сервіс (src/services/auth.js)
`AuthService` надає методи:
- **login(credentials)** - аутентифікація користувача
- **validateToken(token)** - валідація токену
- **refreshToken(oldToken)** - оновлення токену

### 3. Routes (src/routes/auth.js)
Ендпоінти:
- `POST /login` - вхід
- `POST /refresh` - оновлення токену
- `POST /logout` - вихід

### Потік авторизації:
1. Клієнт відправляє POST /login з email/password
2. AuthService перевіряє credentials та генерує JWT
3. Клієнт отримує токен
4. Для захищених роутів - відправляє токен в заголовку
5. authMiddleware перевіряє токен
