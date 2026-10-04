"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { UserRole } from "@/types/api";

interface AuthState { token: string | null; role: UserRole | null; userId: number | null; login(t: string, r: UserRole, id: number): void; logout(): void; }
const Ctx = createContext<AuthState>({ token: null, role: null, userId: null, login() {}, logout() {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  useEffect(() => {
    setToken(localStorage.getItem("access_token"));
    const r = localStorage.getItem("role") as UserRole | null;
    setRole(r);
    const id = localStorage.getItem("user_id");
    setUserId(id ? Number(id) : null);
  }, []);
  return <Ctx.Provider value={{
    token, role, userId,
    login(t, r, id) { localStorage.setItem("access_token", t); localStorage.setItem("role", r); localStorage.setItem("user_id", String(id)); setToken(t); setRole(r); setUserId(id); },
    logout() { localStorage.clear(); setToken(null); setRole(null); setUserId(null); window.location.href = "/login"; },
  }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
export function useRequireRole(roles: UserRole[]) {
  const { role } = useAuth();
  useEffect(() => {
    if (role && !roles.includes(role)) window.location.href = "/";
  }, [role, roles]);
}
