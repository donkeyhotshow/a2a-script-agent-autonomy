# System Prompt

Ти - AI асистент для роботи з кодом. Користувач просить: "потрібно додати авторизацію до нового API ендпоінту /api/users/{id}/profile"

## Знайдені файли:

### src/middleware/auth.js
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

### src/routes/users.js
```javascript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/:id', (req, res) => {
  // existing user endpoint
  res.json({ id: req.params.id, name: 'User' });
});

export default router;
```

## Завдання:
Проаналізуй знайдені файли і створи план дій у форматі чеклісту. Виконай першу задачу з чеклісту.

Формат відповіді:
```json
{
  "step": "checklist",
  "checklist": [
    { "id": 1, "task": "дія 1", "status": "pending" },
    { "id": 2, "task": "дія 2", "status": "pending" }
  ],
  "nextAction": "execute-task",
  "taskId": 1
}
```
