import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, UserRole } from "@/lib/types";
import { API_SERVICE } from "@/services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  loginError: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [loginError, setLoginError] = useState<string | null>(null);

  // Restore session from saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    if (savedToken) {
      API_SERVICE.auth.me(savedToken).then((userData) => {
        if (userData) {
          const restoredUser: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
            credits: userData.credits,
            createdAt: new Date(),
          };
          setUser(restoredUser);
          setToken(savedToken);
          window.dispatchEvent(new CustomEvent("userChanged", { detail: restoredUser }));
        } else {
          // Token invalid, clear
          localStorage.removeItem("auth_token");
          localStorage.removeItem("codebidz_user");
          setToken(null);
        }
      }).catch(() => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("codebidz_user");
        setToken(null);
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoginError(null);
    try {
      const result = await API_SERVICE.auth.login(email, password);
      const loggedInUser: User = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role as UserRole,
        credits: result.user.credits,
        createdAt: new Date(),
      };
      setUser(loggedInUser);
      setToken(result.token);
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("codebidz_user", JSON.stringify(loggedInUser));
      window.dispatchEvent(new CustomEvent("userChanged", { detail: loggedInUser }));
      return true;
    } catch (error: any) {
      setLoginError(error.message || "Login failed");
      return false;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setLoginError(null);
    try {
      const result = await API_SERVICE.auth.register(name, email, password, role);
      const newUser: User = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role as UserRole,
        credits: result.user.credits,
        createdAt: new Date(),
      };
      setUser(newUser);
      setToken(result.token);
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("codebidz_user", JSON.stringify(newUser));
      window.dispatchEvent(new CustomEvent("userChanged", { detail: newUser }));
      return true;
    } catch (error: any) {
      setLoginError(error.message || "Registration failed");
      return false;
    }
  }, []);

  // Refresh user data (credits etc.) from server
  const refreshUser = useCallback(async () => {
    const currentToken = token || localStorage.getItem("auth_token");
    if (!currentToken) return;
    try {
      const userData = await API_SERVICE.auth.me(currentToken);
      if (userData) {
        const updated: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role as UserRole,
          credits: userData.credits,
          createdAt: user?.createdAt || new Date(),
        };
        setUser(updated);
        localStorage.setItem("codebidz_user", JSON.stringify(updated));
      }
    } catch {
      // Silently fail
    }
  }, [token, user?.createdAt]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("codebidz_user");
    window.dispatchEvent(new CustomEvent("userChanged", { detail: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshUser, isAuthenticated: !!user, loginError }}>
      {children}
    </AuthContext.Provider>
  );
};
