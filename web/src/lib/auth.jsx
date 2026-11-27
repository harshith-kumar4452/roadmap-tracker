import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthenticated } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const refresh = useCallback(async () => {
    try {
      const m = await api('/me');
      setAuthenticated(Boolean(m.authenticated));
      setMe(m);
    } catch {
      setMe({ authenticated: false, admin: false, hasAccount: true, editingEnabled: false });
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({
    me,
    ready: me !== null,
    authenticated: Boolean(me?.authenticated),
    admin: Boolean(me?.admin),
    refresh,
    async login(username, password) {
      await api('/login', { method: 'POST', body: { username, password } });
      await refresh();
    },
    async signup(body) {
      await api('/signup', { method: 'POST', body });
      await refresh();
    },
    async logout() {
      await api('/logout', { method: 'POST', body: {} });
      await refresh();
    },
  }), [me, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
