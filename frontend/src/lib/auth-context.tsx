"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getAccessToken, setAccessToken } from "./api";
import type { LoginValues, SignupValues } from "./validators";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (values: LoginValues) => Promise<void>;
  signup: (values: SignupValues) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get<User>("/me");
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  // On mount: if we have a token (or a refresh cookie), try to load the user.
  useEffect(() => {
    (async () => {
      const token = getAccessToken();
      if (token) {
        await loadMe();
      } else {
        // No access token, but a refresh cookie may exist — let the interceptor try.
        try {
          await api.get<User>("/me").then(({ data }) => setUser(data));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, [loadMe]);

  const login = useCallback(async (values: LoginValues) => {
    const { data } = await api.post<{ access_token: string }>("/auth/login", values);
    setAccessToken(data.access_token);
    await loadMe();
  }, [loadMe]);

  const signup = useCallback(async (values: SignupValues) => {
    const payload = {
      email: values.email,
      phone: values.phone ? values.phone : undefined,
      display_name: values.display_name ? values.display_name : undefined,
      pin: values.pin,
    };
    const { data } = await api.post<{ access_token: string }>("/auth/signup", payload);
    setAccessToken(data.access_token);
    await loadMe();
  }, [loadMe]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, refreshUser: loadMe, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
