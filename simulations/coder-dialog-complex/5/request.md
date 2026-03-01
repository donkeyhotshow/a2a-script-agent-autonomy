# System Prompt

Прочитано файли системи авторизації:

## src/middleware/auth.js
```javascript
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

## src/services/auth.js
```javascript
export class AuthService {
  async login(credentials) {...}
  async validateToken(token) {...}
  async refreshToken(oldToken) {...}
}
```

## src/routes/auth.js
```javascript
router.post('/login', ...)
router.post('/refresh', ...)
```

Дай детальну відповідь користувачу про роботу системи авторизації.
