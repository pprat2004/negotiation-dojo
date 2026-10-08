const KEY = 'dojo_user_id'
let memoryId: string | null = null

/** Anonymous per-browser id, sent as X-User-Id. Falls back to memory if storage is blocked. */
export function getUserId(): string {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored) return stored
    const id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return (memoryId ??= crypto.randomUUID())
  }
}