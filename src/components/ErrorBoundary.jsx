import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console in development — in production, send to error tracking service
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Stale-chunk recovery: if a lazy route chunk 404s after a deploy,
    // the cached index.html is outdated. Reload once to fetch the fresh
    // entry point (index.html is no-cache, so this recovers cleanly).
    const msg = String(error?.message || '');
    if (/dynamically imported module|Loading chunk \d+ failed|ChunkLoadError/i.test(msg)) {
      try {
        const key = 'sh_chunk_reload';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
        }
      } catch { /* storage unavailable — show the manual UI below */ }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}>
              <AlertTriangle className="w-8 h-8" style={{ color: 'var(--danger)' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Something went wrong</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              We encountered an unexpected issue. Please try refreshing the page or return to the homepage.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--primary)' }}
              >
                <RefreshCw className="w-4 h-4" /> Refresh page
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <Home className="w-4 h-4" /> Go home
              </a>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 p-4 rounded-xl text-xs text-left overflow-auto" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
