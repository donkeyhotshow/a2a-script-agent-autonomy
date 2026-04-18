/**
 * session/queue.ts — Per-chat async request queue.
 * Ensures only one request is processed at a time per chat,
 * preventing race conditions when users send multiple messages quickly.
 */

type Task = () => Promise<void>

const queues = new Map<number, Promise<void>>()

/**
 * Enqueue a task for the given chatId.
 * The task runs after any previously enqueued task for the same chat completes.
 * Returns a promise that resolves when the task has been executed.
 */
export function enqueue(chatId: number, task: Task): Promise<void> {
  const prev = queues.get(chatId) ?? Promise.resolve()
  const next = prev.then(task).catch((err) => {
    console.error(`[queue] Uncaught error in queued task for chat ${chatId}:`, err)
  })
  queues.set(chatId, next)
  // Clean up the map entry once this task is done to prevent memory leaks
  next.finally(() => {
    if (queues.get(chatId) === next) {
      queues.delete(chatId)
    }
  })
  return next
}

/** Check whether a task is currently running for the given chatId. */
export function isInflight(chatId: number): boolean {
  return queues.has(chatId)
}
