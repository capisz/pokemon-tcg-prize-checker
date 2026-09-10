/** Storage is optional: private browsing, blocked storage, or quota errors must not stop practice. */
export function readStorage(key: string): string | null {
  try { return window.localStorage.getItem(key) } catch { return null }
}
export function writeStorage(key: string, value: string) {
  try { window.localStorage.setItem(key, value) } catch { /* Progress remains available in memory. */ }
}
