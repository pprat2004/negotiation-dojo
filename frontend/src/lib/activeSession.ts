const KEY = 'dojo_active_session'

export function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setActiveSessionId(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* storage blocked */
  }
}

export function clearActiveSessionId(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage blocked */
  }
}