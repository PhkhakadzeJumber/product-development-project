"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthApi, CatalogApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import type { Hospital } from "@/types/api";
import { validatePassword } from "@/lib/password";
import { PasswordInput, PasswordRules } from "@/components/PasswordInput";
import { Card, Field, PrimaryButton, inputCls } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{5,30}$/;
const validPhone = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return PHONE_RE.test(v.trim()) && digits.length >= 7 && digits.length <= 15;
};

const FALLBACK_HOSPITALS: Hospital[] = [
  { hospital_id: 1, name: "Tbilisi Central Hospital", city: "Tbilisi" } as Hospital,
  { hospital_id: 2, name: "Batumi Seaside Clinic", city: "Batumi" } as Hospital,
];

export default function RegisterAdminPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    CatalogApi.hospitals()
      .then((list) => setHospitals(list.length ? list : FALLBACK_HOSPITALS))
      .catch(() => setHospitals(FALLBACK_HOSPITALS));
  }, []);

  const clientError =
    email && !EMAIL_RE.test(email.trim()) ? "Enter a valid email address."
    : phone && !validPhone(phone) ? "Enter a valid phone number."
    : password && validatePassword(password) ? validatePassword(password)
    : confirm && password !== confirm ? "Passwords do not match."
    : null;

  const canSubmit = EMAIL_RE.test(email.trim()) && validPhone(phone) && firstName.trim() && lastName.trim() &&
    hospitalId && password && confirm && !clientError && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!canSubmit) { setErr(clientError ?? "Fill in all required fields."); return; }
    setLoading(true);
    try {
      const t = await AuthApi.registerAdmin({
        email: email.trim().toLowerCase(), phone: phone.trim(), password,
        first_name: firstName.trim(), last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        hospital_id: Number(hospitalId),
      });
      login(t.access_token, t.role, t.user_id);
      router.push("/slots");
    } catch (e: unknown) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Registration failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto"><Card className="p-8">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div><h1 className="text-2xl font-bold">Admin registration</h1>
        <p className="text-sm text-slate-500 mt-1">Manage slots for your hospital.</p></div>
        <Field label="Email" htmlFor="a-email">
          <input id="a-email" className={inputCls} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="admin@hospital.ge" autoComplete="email" />
        </Field>
        <Field label="Phone *" htmlFor="a-phone">
          <input id="a-phone" className={inputCls} type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErr(""); }} placeholder="+995 555 00 00 00" autoComplete="tel" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="a-first">
            <input id="a-first" className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nino" autoComplete="given-name" />
          </Field>
          <Field label="Last name" htmlFor="a-last">
            <input id="a-last" className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Beridze" autoComplete="family-name" />
          </Field>
        </div>
        <Field label="Hospital *" htmlFor="a-hospital">
          <select id="a-hospital" className={inputCls} value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
            <option value="">Select hospital…</option>
            {hospitals.map((h) => <option key={h.hospital_id} value={h.hospital_id}>{h.name}{h.city ? ` — ${h.city}` : ""}</option>)}
          </select>
        </Field>
        <PasswordInput id="a-pw" label="Password" value={password} onChange={(v) => { setPassword(v); setErr(""); }} autoComplete="new-password" />
        <PasswordRules password={password} />
        <PasswordInput id="a-confirm" label="Repeat password" value={confirm} onChange={(v) => { setConfirm(v); setErr(""); }} autoComplete="new-password" placeholder="Repeat password" />
        {(err || clientError) && <p className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-2.5 rounded-xl" role="alert">{err || clientError}</p>}
        <PrimaryButton disabled={!canSubmit} loading={loading}>Register</PrimaryButton>
        <p className="text-sm text-slate-600"><Link className="text-teal-700 font-semibold underline underline-offset-4" href="/login">Back to login</Link></p>
      </form>
    </Card></div>
  );
}
