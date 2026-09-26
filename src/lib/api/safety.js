// ─── Report + block — remote enforcement when the API is configured ────────
// Local fallback stores reports in per-member storage so the flow is testable
// offline; only the backend actually hides content and cuts messaging.
import { read, write } from './storage';
import { http, useRemote } from './transport';

export async function fileReport({ targetType, targetId, reason }) {
  if (useRemote) return http.post('/api/reports', { targetType, targetId, reason });
  const list = read('reports', []);
  const report = { id: `r${Date.now()}`, targetType, targetId, reason, status: 'open', createdAt: new Date().toISOString() };
  write('reports', [...list, report]);
  return { ok: true, id: report.id };
}

export async function blockMember(userId) {
  if (useRemote) return http.post('/api/reports/block', { userId });
  const list = read('blocks', []);
  if (!list.includes(userId)) write('blocks', [...list, userId]);
  return { ok: true };
}

export async function unblockMember(userId) {
  if (useRemote) return http.del(`/api/reports/block/${encodeURIComponent(userId)}`);
  write('blocks', read('blocks', []).filter(id => id !== userId));
  return { ok: true };
}

export async function listBlocks() {
  if (useRemote) return [];
  return read('blocks', []);
}

const isNotFound = (err) => /\(404\)|not found/i.test(err?.message || '');

// Delete the signed-in account. Tries the canonical /api/users/me first,
// falls back to the repo's existing /api/auth/account, and surfaces a clear
// "not available yet" when neither route exists on the server.
export async function deleteAccount() {
  if (!useRemote) return { ok: true, local: true };
  try {
    return await http.del('/api/users/me');
  } catch (e) {
    if (!isNotFound(e)) throw e;
  }
  try {
    return await http.del('/api/auth/account');
  } catch (e) {
    if (isNotFound(e)) throw new Error('Account deletion is not available yet.');
    throw e;
  }
}
