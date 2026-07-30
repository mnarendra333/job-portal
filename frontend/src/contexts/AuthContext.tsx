import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    mobile?: string;
    role: string;
    organization_name?: string;
  }) => Promise<User>;
  oauthLogin: (provider: 'google' | 'linkedin', code: string, redirectUri: string, extra?: { role?: string; organization_name?: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const storeTokens = async (tokens: { access_token: string; refresh_token: string }) => {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    const me = await api.me();
    setUser(me);
    return me;
  };

  const login = async (email: string, password: string) => storeTokens(await api.login(email, password));

  const register = async (data: {
    email: string;
    password: string;
    full_name: string;
    mobile?: string;
    role: string;
    organization_name?: string;
  }) => storeTokens(await api.register(data));

  const oauthLogin = async (
    provider: 'google' | 'linkedin',
    code: string,
    redirectUri: string,
    extra?: { role?: string; organization_name?: string },
  ) => {
    const fn = provider === 'google' ? api.oauthGoogle : api.oauthLinkedIn;
    return storeTokens(await fn({ code, redirect_uri: redirectUri, ...extra }));
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, oauthLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
