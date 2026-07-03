import { get, set, del } from 'idb-keyval';

const SESSIONS_KEY = 'vibeforge-chat-sessions';

export async function loadSessionsFromIDB() {
  try { return (await get<unknown[]>(SESSIONS_KEY)) ?? []; } catch { return []; }
}

export async function saveSessionsToIDB(sessions: unknown[]) {
  try { await set(SESSIONS_KEY, sessions); } catch {}
}

export async function deleteSessionFromIDB(id: string, allSessions: unknown[]) {
  const filtered = (allSessions as Array<{ id: string }>).filter(s => s.id !== id);
  await saveSessionsToIDB(filtered);
  return filtered;
}
