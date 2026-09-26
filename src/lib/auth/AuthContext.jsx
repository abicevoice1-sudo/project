import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth as authService } from '../api/authService';

const AuthContext = createContext(null);

/**
 * Single source of truth for member auth.
 * Session shape: { uid, email, displayName, isAdmin } | null
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = authService.current();
    setUser(current);
    // Stamp the uid this tab booted with so the identity-change guard below
    // can detect a different account signing in from another tab.
    try {
      document.documentElement.dataset.sessionUid = current?.uid || '';
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Detect session changes from other tabs/windows (e.g. a different account
  // Fail closed on identity change: if the uid changes under us (another tab
  // signed in as a different account on a shared browser), do a full reload
  // instead of silently swapping the user object. Merely setUser(next) would
  // leave the previous account's profiles, messages, and drafts in memory and
  // in component state. A reload rebuilds everything from the new session.
  useEffect(() => {
    const identityChanged = () => {
      const next = authService.current();
      // Read the uid this tab rendered for from a data attribute set at boot.
      const bootUid = document.documentElement.dataset.sessionUid || null;
      if ((bootUid || null) !== (next?.uid || null)) {
        window.location.reload();
      }
    };
    const onStorage = (e) => {
      if (e.key !== 'sh_session') identityChanged();
    };
    window.addEventListener('storage', onStorage);
    // Also re-validate on window focus: catches token expiry / server-side
    // session invalidation that happened while the tab was in the background.
    window.addEventListener('focus', identityChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', identityChanged);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const session = await authService.login({ email, password });
    setUser(session);
    return { user: session };
  }, []);

  const register = useCallback(async (data) => {
    const session = await authService.register(data);
    setUser(session);
    return { user: session };
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isLoggedIn: !!user, isAdmin: user?.isAdmin === true, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
