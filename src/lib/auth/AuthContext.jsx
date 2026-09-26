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
    setUser(authService.current());
    setLoading(false);
  }, []);

  // Detect session changes from other tabs/windows (e.g. a different account
  // signing in on a shared browser). Never silently flip identity: if the
  // uid changes under us, reset to the new session so the UI re-renders
  // for the correct account instead of showing stale private data.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'sh_session') return;
      const next = authService.current();
      setUser((prev) => {
        if ((prev?.uid || null) !== (next?.uid || null)) {
          // Identity changed — force a clean state for the new account.
          return next;
        }
        return prev;
      });
    };
    window.addEventListener('storage', onStorage);
    // Also re-validate on window focus: catches token expiry / server-side
    // session invalidation that happened while the tab was in the background.
    const onFocus = () => {
      const next = authService.current();
      setUser((prev) =>
        (prev?.uid || null) !== (next?.uid || null) ? next : prev
      );
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
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
