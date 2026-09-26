import { useEffect, useState } from 'react';
import { Link2, Copy, Check, Trash2, Plus } from 'lucide-react';
import { http } from '../lib/api/transport';

// Wali (guardian) invite links — the member generates a read-only link for a
// family member, and can revoke it at any time. Listed here with revoke UI.
export default function WaliLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await http.get('/api/wali/link');
      setLinks(data.links || []);
    } catch (e) {
      setError(e.message || 'Could not load guardian links.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    setError('');
    try {
      await http.post('/api/wali/link', {});
      await load();
    } catch (e) {
      setError(e.message || 'Could not create link.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (token) => {
    if (!confirm('Revoke this guardian link? The person with the link will lose access immediately.')) return;
    try {
      await http.del(`/api/wali/link/${encodeURIComponent(token)}`);
      await load();
    } catch (e) {
      setError(e.message || 'Could not revoke link.');
    }
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setError('Could not copy — please copy the link manually.');
    }
  };

  return (
    <div className="pt-6 border-t border-line/10">
      <h3 className="text-base font-semibold text-ink mb-1 flex items-center gap-2">
        <Link2 className="w-4 h-4" /> Guardian (Wali) Links
      </h3>
      <p className="text-sm text-muted mb-4">
        Share a read-only view of your profile with a family member or wali.
        They see your profile — never your messages or contact details.
        Revoke any link at any time.
      </p>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted mb-3">No guardian links yet.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {links.map((l) => (
            <div
              key={l.token}
              className={`flex items-center gap-2 p-3 rounded-lg border ${l.revoked ? 'opacity-50' : ''}`}
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-elevated)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono truncate text-muted">{l.url}</p>
                <p className="text-[11px] text-muted">
                  Created {new Date(l.createdAt).toLocaleDateString()}
                  {l.revoked && ' — revoked'}
                </p>
              </div>
              {!l.revoked && (
                <>
                  <button
                    onClick={() => copy(l.url)}
                    className="p-2 rounded-lg hover:bg-black/5"
                    title="Copy link"
                  >
                    {copied === l.url ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => revoke(l.token)}
                    className="p-2 rounded-lg hover:bg-black/5 text-danger"
                    title="Revoke link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={create}
        disabled={creating}
        className="button primary px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {creating ? 'Creating…' : 'Generate guardian link'}
      </button>
    </div>
  );
}
