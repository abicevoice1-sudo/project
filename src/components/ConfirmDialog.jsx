import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

// In-app confirmation dialog — replaces the native window.confirm(), which is
// auto-dismissed by automated browsers and some popup blockers, silently
// cancelling the action (e.g. wali-link revoke never fired). This dialog is a
// real DOM element: it works everywhere, is keyboard-accessible, and can be
// driven by QA automation.
export default function ConfirmDialog({
  open = true,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  if (!open) return null;

  return (
    <div
      className="ai-backdrop"
      style={{ zIndex: 500 }}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="ai-drawer"
        style={{ width: '380px', maxWidth: '95vw', margin: '2rem auto', borderRadius: 'var(--radius-xl)', position: 'relative', top: '20vh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="ai-drawer-header">
          <div className="ai-orb" style={danger ? { background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' } : undefined}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div><p className="ai-drawer-title">{title}</p></div>
          <button className="ai-icon-btn" onClick={onCancel} aria-label="Close">
            <span style={{ fontSize: '1.25rem' }}>×</span>
          </button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {message && (
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-ink-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {message}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              className="button px-4 py-2.5 font-semibold"
              style={{ background: 'var(--color-elevated)', color: 'var(--color-ink)', border: '1px solid var(--color-border)' }}
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            <button
              className={`button primary px-4 py-2.5 font-semibold ${danger ? '' : ''}`}
              style={danger ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : undefined}
              onClick={onConfirm}
              disabled={busy}
              autoFocus
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
