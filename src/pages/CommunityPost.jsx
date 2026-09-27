import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../layouts/LandingLayout';
import LoginGate from '../components/LoginGate';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../lib/auth/AuthContext';
import { ArrowLeft, ChevronRight, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { addReply, getPost, listReplies, deletePost, deleteReply } from '../lib/communityData';
import { ReportButton } from '../components/ReportButton';

const initials = name => String(name || 'A').trim().charAt(0).toUpperCase();

// Full-page post view — the destination the feed links to. Reading is open to
// everyone; writing asks for an account (same rule as the feed).
export default function CommunityPost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, user } = useAuth();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [moderating, setModerating] = useState(false);
  // In-app confirmations replace window.confirm() (auto-dismissed by automated
  // browsers, silently cancelling the action).
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [confirmDeleteReply, setConfirmDeleteReply] = useState(null);

  // The app sets history.scrollRestoration = 'manual', so opening a post has to
  // put the reader at the top itself.
  useEffect(() => { window.scrollTo(0, 0); }, [postId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, r] = await Promise.all([getPost(postId), listReplies(postId)]);
        if (cancelled) return;
        setPost(p);
        setReplies(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [postId]);

  const communityHref = post && post.sub ? `/community/${post.sub}` : '/community';
  const communityLabel = post?.sub || 'all';

  const submitReply = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) { setShowLoginGate(true); return; }
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      await addReply(postId, { body: draft, author: user?.displayName || 'You' });
      setReplies(await listReplies(postId));
      const updated = await getPost(postId);
      if (updated) setPost(updated);
      setDraft('');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}>
            <p style={{ color: 'var(--color-ink-secondary)' }}>Loading discussion…</p>
          </div>
        </main>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>Post not found</h1>
            <p className="mb-6" style={{ color: 'var(--color-ink-secondary)' }}>
              This discussion may have been removed, or the link is from a different account — posts created while signed in are stored per member in this browser.
            </p>
            <Link to="/community" className="button primary inline-flex items-center gap-2 px-5 py-2.5 font-semibold">
              <ArrowLeft className="w-4 h-4" /> Back to Community
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mb-4 text-xs flex-wrap" style={{ color: 'var(--color-ink-secondary)' }} aria-label="Breadcrumb">
          <Link to="/community" className="hover:underline" style={{ color: 'var(--color-primary)' }}>Community</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={communityHref} className="hover:underline" style={{ color: 'var(--color-primary)' }}>/{communityLabel}</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Post</span>
        </nav>

        <article className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {post.pinned && (
              <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: 'var(--color-primary)' }}>Pinned</span>
            )}
            <Link to={communityHref} className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }}>
              /{communityLabel}
            </Link>
            <span className="text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>· {post.time}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--color-ink)', lineHeight: 1.25 }}>{post.title}</h1>

          <p className="text-xs mb-4" style={{ color: 'var(--color-ink-faint)' }}>
            by {post.author}{post.mine ? ' (you)' : ''}
          </p>

          {post.body
            ? <p className="mb-4" style={{ color: 'var(--color-ink)', fontSize: '1rem', lineHeight: 1.75 }}>{post.body}</p>
            : <p className="mb-4 text-sm" style={{ color: 'var(--color-ink-faint)' }}>This post has no body text.</p>}

          {post.tags?.length > 0 && (
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {post.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--color-ink-secondary)', background: 'var(--color-surface)' }}>#{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-3 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-secondary)' }}>
            <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.replies} replies</span>
            <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likes} likes</span>
            <ReportButton targetType="post" targetId={String(post.id)} />
            {isAdmin && (
              <button
                type="button"
                disabled={moderating}
                onClick={() => setConfirmDeletePost(true)}
                className="flex items-center gap-1 hover:underline"
                style={{ color: 'var(--color-danger)' }}
                aria-label="Delete this post (moderation)"
              >
                <Trash2 className="w-3.5 h-3.5" /> {moderating ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <Link to={communityHref} className="flex items-center gap-1 ml-auto hover:underline" style={{ color: 'var(--color-primary)' }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back to /{communityLabel}
            </Link>
          </div>
        </article>

        {/* Reply composer — same gate as the feed */}
        <section className="mt-6">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-ink)' }}>Join the discussion</h2>
          <form onSubmit={submitReply} className="rounded-xl p-4" style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}>
            <label htmlFor="reply-body" className="sr-only">Your reply</label>
            <textarea
              id="reply-body"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onFocus={() => { if (!isLoggedIn) setShowLoginGate(true); }}
              placeholder={isLoggedIn ? 'Share your thoughts — respectful and on topic…' : 'Log in to reply. Reading stays open to everyone.'}
              rows={3}
              className="input w-full resize-none"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            />
            <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
              <p className="text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>
                Be kind. No contact details, no soliciting, no personal attacks.
              </p>
              <button type="submit" className="button primary px-5 py-2 font-semibold text-sm" disabled={isLoggedIn && !draft.trim()}>
                Reply
              </button>
            </div>
          </form>
        </section>

        {/* Replies */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>{post.replies} {post.replies === 1 ? 'reply' : 'replies'}</h2>
            {post.replies > replies.length && (
              <p className="text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>
                The {replies.length} most recent are shown below — earlier replies are not part of this demo build.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {replies.map(reply => (
              <div key={reply.id} className="rounded-xl p-4" style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                    {initials(reply.author)}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>{reply.author}{reply.mine ? ' (you)' : ''}</span>
                  <span className="text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>· {reply.time}</span>
                </div>
                <p style={{ color: 'var(--color-ink-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>{reply.body}</p>
                <div className="mt-2 flex items-center gap-3">
                  <ReportButton targetType="reply" targetId={String(reply.id)} />
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={moderating}
                      onClick={() => setConfirmDeleteReply(reply.id)}
                      className="flex items-center gap-1 text-xs hover:underline"
                      style={{ color: 'var(--color-danger)' }}
                      aria-label={`Delete reply by ${reply.author} (moderation)`}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}

            {replies.length === 0 && (
              <div className="rounded-xl p-6 text-center" style={{ background: 'var(--color-elevated)', border: '1px dashed var(--color-border)' }}>
                <p style={{ color: 'var(--color-ink-secondary)', fontSize: '0.875rem' }}>No replies yet — be the first to respond.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      {showLoginGate && <LoginGate onClose={() => setShowLoginGate(false)} />}
      {confirmDeletePost && (
        <ConfirmDialog
          title="Delete this post?"
          message="The post and all its replies will be permanently removed. This cannot be undone."
          confirmLabel="Delete post"
          danger
          busy={moderating}
          onConfirm={async () => {
            setModerating(true);
            try {
              await deletePost(post.id);
              navigate(communityHref);
            } catch (e) {
              window.alert(e?.message || 'Could not delete this post.');
            } finally {
              setModerating(false);
              setConfirmDeletePost(false);
            }
          }}
          onCancel={() => { if (!moderating) setConfirmDeletePost(false); }}
        />
      )}
      {confirmDeleteReply && (
        <ConfirmDialog
          title="Delete this reply?"
          message="The reply will be permanently removed. This cannot be undone."
          confirmLabel="Delete reply"
          danger
          busy={moderating}
          onConfirm={async () => {
            setModerating(true);
            try {
              await deleteReply(confirmDeleteReply);
              setReplies(await listReplies(postId));
            } catch (e) {
              window.alert(e?.message || 'Could not delete this reply.');
            } finally {
              setModerating(false);
              setConfirmDeleteReply(null);
            }
          }}
          onCancel={() => { if (!moderating) setConfirmDeleteReply(null); }}
        />
      )}
    </Layout>
  );
}
