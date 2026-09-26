// ─── Storage adapter — per-member namespaced keys ──────────────────────────
// The SESSION key itself is NEVER namespaced (it holds the UID that defines
// the namespace). All other keys are `sh_<key>::<uid>` while signed in.
// On logout, the session is destroyed and per-user keys become unreachable.
// Signed-out callers get the fallback for non-session keys.

const PREFIX = 'sh_';
const SESSION_KEY = 'session';

function sessionUid() {
  try {
    const raw = localStorage.getItem(PREFIX + SESSION_KEY);
    const uid = raw ? JSON.parse(raw)?.uid : null;
    return uid || null;
  } catch {
    return null;
  }
}

function keyFor(key) {
  // The session itself lives at the bare key — never namespaced.
  if (key === SESSION_KEY) return PREFIX + SESSION_KEY;
  const uid = sessionUid();
  return PREFIX + key + (uid ? `::${uid}` : '');
}

export function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(keyFor(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(keyFor(key), JSON.stringify(value));
  } catch {
    /* quota exceeded — non-fatal */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(keyFor(key));
  } catch {
    /* ignore */
  }
}

// Remove ALL keys for a given uid (used on logout to prevent leaks).
// Also removes the session itself.
export function clearUserData(uid = null) {
  try {
    const targetUid = uid || sessionUid();
    // Remove session first
    localStorage.removeItem(PREFIX + SESSION_KEY);
    if (!targetUid) return;
    const suffix = `::${targetUid}`;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.endsWith(suffix)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
