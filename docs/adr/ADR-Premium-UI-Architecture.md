# ADR: Архитектура A2A Premium Console (Next.js + Tailwind 4)

- **Статус**: Принято
- **Дата**: 2026-04-01
- **Контекст**: Для обеспечения современного UX ("WOW-эффект") и поддержки сложных интерактивных сессий (артефакты, стриминг, боковые панели), A2A переходит на новый стек фронтенда.

## Технологический стек

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4 (Zero-runtime CSS)
- **Components**: Radix UI / Lucide React
- **Animations**: Framer Motion
- **State/Query**: Nuqs (URL-based state)

## Связь с A2A Backend

Интерфейс работает автономно от LangChain и подключается к A2A Client API через кастомный адаптер.

### 1. Проксирование (Next.js Rewrites)
Все запросы к `/api/a2a/*` проксируются на порт 5173 (Vite/Client API).

```javascript
// next.config.mjs
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/a2a/:path*",
        destination: "http://localhost:5173/api/a2a/:path*",
      },
    ];
  },
};
```

### 2. Адаптер потока данных (useA2AStream)
Кастомный хук преобразует сессию A2A в формат, понятный компонентам чата.

```typescript
// hooks/useA2AStream.ts
export function useA2AStream(options: { apiUrl: string, threadId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const submit = async (data: any) => {
    // Отправка задачи в A2A Client API
    await fetch(`/api/a2a/sessions/${id}/next`, {
      method: 'POST',
      body: JSON.stringify({ task: data.content })
    });
    // Запуск опроса /async для получения результата
  };

  return { messages, submit, isLoading };
}
```

### 3. Боковая панель артефактов (Artifacts Panel)
Использует систему контекста для отображения файлов или состояния Task Flow.

```tsx
// Пример компонента артефакта
export function A2AFileViewer({ content }: { content: string }) {
  const [Artifact, { open, setOpen }] = useArtifact();
  
  return (
    <Artifact title="File Preview">
      <SyntaxHighlighter language="typescript">
        {content}
      </SyntaxHighlighter>
    </Artifact>
  );
}
```

## Как дорабатывать (Developer Guide)

1. **Добавление нового типа сообщения**: Модифицировать `src/components/thread/messages/` и добавить обработку в `useA2AStream`.
2. **Интеграция панелей A2A**: Использовать `src/components/thread/artifact/` для рендеринга `CONFIDENCE_TRACE` или `TASK_FLOW`.
3. **Кастомизация стилей**: Все токены Tailwind 4 находятся в `src/app/globals.css`.

## Последствия

- **Плюсы**: Высокая производительность Next.js, современные анимации, чистый код без внешнего брендинга.
- **Риски**: Необходимость поддержки TypeScript/Next.js инфраструктуры.
