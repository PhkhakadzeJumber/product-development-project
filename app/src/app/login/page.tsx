"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Card, Field, PrimaryButton, inputCls } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!email.trim() || !password) { setErr("Enter your email and password."); return; }
    setLoading(true);
    try {
      const t = await AuthApi.login(email.trim().toLowerCase(), password);
      login(t.access_token, t.role, t.user_id);
      router.push(t.role === "PATIENT" ? "/doctors" : t.role === "DOCTOR" ? "/timetable" : "/slots");
    } catch (e: unknown) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-8">
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div><h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Login to book visits or open your timetable.</p></div>
          <Field label="Email" htmlFor="login-email">
            <input id="login-email" className={inputCls} type="email" autoComplete="email"
              placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <input id="login-password" className={inputCls} type="password" autoComplete="current-password"
              placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} />
          </Field>
          {err && <p className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-2.5 rounded-xl" role="alert">{err}</p>}
          <PrimaryButton loading={loading}>Login</PrimaryButton>
          <div className="text-sm text-slate-600 space-y-1 pt-1">
            <p>No account? <Link className="text-teal-700 font-semibold underline underline-offset-4" href="/register/patient">Register as patient</Link></p>
            <p className="text-xs">Demo password <code className="bg-slate-100 px-1 rounded">Test123!</code>: patient@demo.ge · doctor@demo.ge · admin@demo.ge</p>
          </div>
        </form>
      </Card>
    </div>
  );
}
