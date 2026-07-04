import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetMe, getGetMeQueryKey, login, logout, LoginInput } from '@workspace/api-client-react';

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('oal_admin_token'));
  
  const { data: user, isLoading: isUserLoading, refetch } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  });

  // Intercept fetch to append token automatically.
  // IMPORTANT: init.headers may be a Headers instance (not a plain object).
  // Spreading a Headers instance gives {}, losing all existing headers (e.g.
  // Content-Type), which causes express.json() to skip body parsing.
  // Use `new Headers(init.headers)` to copy correctly, then set Authorization.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const currentToken = localStorage.getItem('oal_admin_token');

      // Only inject Authorization for same-origin /api requests.
      // Never attach admin credentials to third-party requests.
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const isSameOriginApi =
        url.startsWith('/api') ||
        url.startsWith(`${window.location.origin}/api`);

      // Always clone init so we never mutate the caller's object
      const newInit: RequestInit = { ...(init ?? {}) };
      const headers = new Headers(newInit.headers);
      if (currentToken && isSameOriginApi) {
        headers.set('Authorization', `Bearer ${currentToken}`);
      }
      newInit.headers = headers;
      const response = await originalFetch(input, newInit);
      if (response.status === 401 && isSameOriginApi) {
        localStorage.removeItem('oal_admin_token');
        setToken(null);
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const handleLogin = async (credentials: LoginInput) => {
    const res = await login(credentials);
    if (res && res.token) {
      localStorage.setItem('oal_admin_token', res.token);
      setToken(res.token);
      await refetch();
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {}
    localStorage.removeItem('oal_admin_token');
    setToken(null);
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading: isUserLoading,
      isAuthenticated,
      login: handleLogin,
      logout: handleLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
