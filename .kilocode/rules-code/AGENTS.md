# Project Coding Rules (Non-Obvious Only)

- **Use .js extension for path aliases** - Imports like `import x from '@/services/x'` must use `.js` extension: `import x from '@/services/x.js'` (NodeNext module resolution in [`tsconfig.json`](a2a-server/tsconfig.json:4-5))
- **Actions use sub-actions with DSL** - Each action MD file contains sub-actions with TypeScript code blocks that run on client

### qtu - Question to User
`qtu` - PowerShell скрипт для интерактивного задавания вопросов через веб-интерфейс.

```powershell
powershell -ExecutionPolicy Bypass -File C:\workspace\bin\qtu.ps1 -Question "Ваш вопрос?"
powershell -ExecutionPolicy Bypass -File C:\workspace\bin\qtu.ps1 -Question "Выбрать?" -Options "Вариант1,Вариант2,Вариант3"
```

**Требования:** PHP в PATH, браузер по умолчанию
