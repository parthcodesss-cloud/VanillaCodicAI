import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Handle Google OAuth popup callback — when the popup lands on /?auth_success=1
  // it posts a message to opener then closes itself
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // This page is the popup result — notify parent and close
    if (params.get("auth_success")) {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS" }, window.location.origin);
      }
      window.history.replaceState({}, "", "/");
      // If we're in a popup, close it; otherwise just refresh user
      if (window.opener) {
        window.close();
      } else {
        fetchMe();
      }
    }

    if (params.get("auth_error")) {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "GOOGLE_AUTH_ERROR", error: params.get("auth_error") },
          window.location.origin
        );
        window.close();
      }
      window.history.replaceState({}, "", "/");
    }
  }, [fetchMe]);

  // Listen for messages from the OAuth popup
  useEffect(() => {
    const handler = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        fetchMe();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [fetchMe]);

  const login = async ({ email, password }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user);
    return data.user;
  };

  const register = async ({ name, email, phone, password }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  const loginWithGoogle = () => {
    // Open in a popup so it works inside iframes (Google blocks OAuth in iframes)
    const width = 500;
    const height = 620;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    const features = `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`;

    const popup = window.open("/api/auth/google", "google-oauth-popup", features);

    // Fallback: if popup was blocked, fall back to full redirect
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = "/api/auth/google";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithGoogle, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
