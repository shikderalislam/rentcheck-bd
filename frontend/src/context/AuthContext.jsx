import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setUser(data.user);
    return data; // { user, token, verification }
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  // Verifies with a token (from the email link / dev token) and refreshes user.
  const verifyEmail = async (token) => {
    const { data } = await api.post("/auth/verify-email", { token });
    setUser(data.user);
    return data.user;
  };

  const resendVerification = async () => {
    const { data } = await api.post("/auth/resend-verification");
    return data.verification; // { verifyUrl, devToken } in dev
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, verifyEmail, resendVerification, refresh: fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
