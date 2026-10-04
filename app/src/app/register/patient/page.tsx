"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { validatePassword } from "@/lib/password";
import { PasswordInput, PasswordRules } from "@/components/PasswordInput";
import { Avatar } from "@/components/Avatar";
import { Card, Field, PrimaryButton, inputCls } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPatientPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [err, setErr] = useState("");
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const clientError = useMemo(() => {
    if (email && !EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
    if (password && validatePassword(password)) return validatePassword(password);
    if (confirm && password !== confirm) return "Passwords do not match.";
    return null;
  }, [email, password, confirm]);

  const canSubmit = email.trim() !== "" && firstName.trim() !== "" && lastName.trim() !== "" &&
    password !== "" && confirm !== "" && !clientError && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setFieldErrs({});
    if (!canSubmit) { setErr(clientError ?? "Fill in all fields correctly."); return; }
    setLoading(true);
    try {
      const t = await AuthApi.registerPatient({
        email: email.trim().toLowerCase(), password,
        first_name: firstName.trim(), last_name: lastName.trim(),
        avatar_url: avatarUrl.trim() || null,
      });
      login(t.access_token, t.role, t.user_id);
      router.push("/doctors");
    } catch (e: unknown) {
      if (e instanceof ApiError) { setErr(e.message); setFieldErrs(e.fields); }
      else setErr(e instanceof Error ? e.message : "Registration failed");
    } finally { setLoading(false); }
  }

  const cls = (bad?: string) => `${inputCls} ${bad ? "!border-rose-500" : ""}`;

  return (
    <div className="max-w-md mx-auto"><Card className="p-8">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div><h1 className="text-2xl font-bold">Create patient account</h1>
        <p className="text-sm text-slate-500 mt-1">Book visits and track prescriptions.</p></div>
        <Field label="Email" htmlFor="email">
          <input id="email" className={cls(fieldErrs.email)} type="email" autoComplete="email"
            placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
          {fieldErrs.email && <p className="text-rose-600 text-sm mt-1">{fieldErrs.email}</p>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="first_name">
            <input id="first_name" className={cls(fieldErrs.first_name)} autoComplete="given-name"
              placeholder="Anna" value={firstName} onChange={(e) => { setFirstName(e.target.value); setErr(""); }} />
          </Field>
          <Field label="Last name" htmlFor="last_name">
            <input id="last_name" className={cls(fieldErrs.last_name)} autoComplete="family-name"
              placeholder="Beridze" value={lastName} onChange={(e) => { setLastName(e.target.value); setErr(""); }} />
          </Field>
        </div>
        <PasswordInput id="password" label="Password" value={password} onChange={(v) => { setPassword(v); setErr(""); }} autoComplete="new-password" />
        <PasswordRules password={password} />
        <PasswordInput id="confirm" label="Repeat password" value={confirm} onChange={(v) => { setConfirm(v); setErr(""); }} autoComplete="new-password" placeholder="Repeat password" />
        <Field label="Avatar URL (optional)" htmlFor="avatar" hint="Photo shown next to your bookings and chat.">
          <div className="flex items-center gap-3">
            <Avatar src={avatarUrl.trim() || null} firstName={firstName} lastName={lastName} size={44} />
            <input id="avatar" className={cls(fieldErrs.avatar_url)} placeholder="/avatars/patients/ana.svg or https://…"
              value={avatarUrl} onChange={(e) => { setAvatarUrl(e.target.value); setErr(""); }} />
          </div>
        </Field>
        {(err || clientError) && <p className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-2.5 rounded-xl" role="alert">{err || clientError}</p>}
        <PrimaryButton disabled={!canSubmit} loading={loading}>Create account</PrimaryButton>
        <p className="text-sm text-slate-600">Already have an account? <Link className="text-teal-700 font-semibold underline underline-offset-4" href="/login">Log in</Link></p>
      </form>
    </Card></div>
  );
}
