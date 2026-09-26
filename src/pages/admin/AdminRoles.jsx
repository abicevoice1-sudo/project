import { useState } from 'react';
import Layout from '@/layouts/MainLayout';
import { useToast } from '@lib/useToast';
import { http, useRemote } from '@lib/api/transport';

// Admin: grant the matchmaker or guardian role. Matchmakers can only draft
// women; guardians draft male family members. Revoking returns a member to the
// plain role — their existing drafts stay theirs but no new ones.
export default function AdminRoles() {
  const [uid, setUid] = useState('');
  const [role, setRole] = useState('matchmaker');
  const [busy, setBusy] = useState(false);
  const [blockUid, setBlockUid] = useState('');
  const [blockBusy, setBlockBusy] = useState(false);
  const { addToast } = useToast();

  const assign = async (e) => {
    e.preventDefault();
    const id = uid.trim();
    if (!id) return;
    setBusy(true);
    try {
      if (!useRemote) throw new Error('Role assignment needs the live backend.');
      await http.post(`/api/admin/users/${encodeURIComponent(id)}/role`, { role });
      addToast(`Role "${role}" granted. The member sees it on their next load.`, 'success');
      setUid('');
    } catch (err) {
      addToast(err.message || 'Could not assign the role.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <main>
        <h1>Grant introducer roles</h1>
        <p>
          The member's uid is on their profile URL or any admin user listing. <strong>matchmaker</strong> introduces women only;
          <strong> guardian</strong> introduces male family members. Members can never self-promote — this is the only door.
        </p>

        <form onSubmit={assign} className="settings-list" style={{ maxWidth: 640 }}>
          <div className="toggle-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'grid', gap: 12 }}>
              <div>
                <label htmlFor="role-uid" className="block mb-1.5 text-sm font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Member uid</label>
                <input id="role-uid" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="e.g. aa2281f5-4942-4cfa-8b79-9c0e4d1094e7" className="input w-full" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} required />
              </div>
              <div>
                <label htmlFor="role-kind" className="block mb-1.5 text-sm font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Role</label>
                <select id="role-kind" value={role} onChange={(e) => setRole(e.target.value)} className="input w-full" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <option value="matchmaker">matchmaker — drafts women only</option>
                  <option value="guardian">guardian — family drafts (male + female)</option>
                  <option value="member">member — revoke introducer access</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={busy} className="button primary px-5 py-2 font-semibold text-sm">
              {busy ? 'Assigning…' : 'Assign role'}
            </button>
          </div>
        </form>

        {/* ── Moderation: unflag / unblock a member ───────────────────────────
            Reverses a block set by the Safety-reports "Hide + action" flow
            (profiles.is_blocked = 1). Idempotent; 404 for unknown members. */}
        <h2 style={{ marginTop: '36px' }}>Unblock a member</h2>
        <p>
          A blocked member's profile is invisible to everyone. Unblocking restores
          their profile immediately — their data is never deleted.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const id = blockUid.trim();
            if (!id) return;
            setBlockBusy(true);
            try {
              if (!useRemote) throw new Error('Unblocking needs the live backend.');
              await http.post(`/api/admin/users/${encodeURIComponent(id)}/unblock`, {});
              addToast(`Member unblocked. Their profile is visible again.`, 'success');
              setBlockUid('');
            } catch (err) {
              addToast(err.message || 'Could not unblock this member.', 'error');
            } finally {
              setBlockBusy(false);
            }
          }}
          className="settings-list"
          style={{ maxWidth: 640 }}
        >
          <div className="toggle-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="unblock-uid" className="block mb-1.5 text-sm font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Member uid</label>
              <input id="unblock-uid" value={blockUid} onChange={(e) => setBlockUid(e.target.value)} placeholder="e.g. aa2281f5-4942-4cfa-8b79-9c0e4d1094e7" className="input w-full" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} required />
            </div>
            <button type="submit" disabled={blockBusy} className="button primary px-5 py-2 font-semibold text-sm">
              {blockBusy ? 'Unblocking…' : 'Unblock account'}
            </button>
          </div>
        </form>
      </main>
    </Layout>
  );
}
