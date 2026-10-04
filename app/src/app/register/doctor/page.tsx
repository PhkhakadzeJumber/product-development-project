"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthApi, CatalogApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import type { Hospital, Specialization } from "@/types/api";
import { validatePassword } from "@/lib/password";
import { PasswordInput, PasswordRules } from "@/components/PasswordInput";
import { Avatar } from "@/components/Avatar";
import { Card, Field, PrimaryButton, inputCls } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FALLBACK_HOSPITALS: Hospital[] = [
  { hospital_id: 1, name: "Tbilisi Central Hospital", city: "Tbilisi" } as Hospital,
  { hospital_id: 2, name: "Batumi Seaside Clinic", city: "Batumi" } as Hospital,
];

export default function RegisterDoctorPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [license, setLicense] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [specId, setSpecId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    CatalogApi.hospitals()
      .then((list) => setHospitals(list.length ? list : FALLBACK_HOSPITALS))
      .catch(() => setHospitals(FALLBACK_HOSPITALS));
    CatalogApi.specializations().then(setSpecs).catch(() => {});
  }, []);

  const clientError =
    email && !EMAIL_RE.test(email.trim()) ? "Enter a valid email address."
    : password && validatePassword(password) ? validatePassword(password)
    : confirm && password !== confirm ? "Passwords do not match."
    : null;

  const canSubmit = EMAIL_RE.test(email.trim()) && firstName.trim() && lastName.trim() &&
    hospitalId && photoUrl.trim() && password && confirm && !clientError && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!canSubmit) { setErr(clientError ?? "Fill in all required fields."); return; }
    setLoading(true);
    try {
      const t = await AuthApi.registerDoctor({
        email: email.trim().toLowerCase(), password,
        first_name: firstName.trim(), last_name: lastName.trim(),
        hospital_id: Number(hospitalId), specialization_id: specId ? Number(specId) : null,
        license_number: license.trim() || null, photo_url: photoUrl.trim(),
      });
      login(t.access_token, t.role, t.user_id);
      router.push("/timetable");
    } catch (e: unknown) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Registration failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto"><Card className="p-8">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <p className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded-xl">
          DEV ONLY — open self-registration for testing. Remove before production.
        </p>
        <div><h1 className="text-2xl font-bold">Doctor registration</h1>
        <p className="text-sm text-slate-500 mt-1">Photo is required — shown to patients.</p></div>
        <Field label="Email" htmlFor="d-email">
          <input id="d-email" className={inputCls} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="doctor@example.com" autoComplete="email" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="d-first">
            <input id="d-first" className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Gio" autoComplete="given-name" />
          </Field>
          <Field label="Last name" htmlFor="d-last">
            <input id="d-last" className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Kapanadze" autoComplete="family-name" />
          </Field>
        </div>
        <Field label="Hospital *" htmlFor="d-hospital">
          <select id="d-hospital" className={inputCls} value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
            <option value="">Select hospital…</option>
            {hospitals.map((h) => <option key={h.hospital_id} value={h.hospital_id}>{h.name}{h.city ? ` — ${h.city}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Specialization" htmlFor="d-spec">
          <select id="d-spec" className={inputCls} value={specId} onChange={(e) => setSpecId(e.target.value)}>
            <option value="">None</option>
            {specs.map((s) => <option key={s.specialization_id} value={s.specialization_id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="License number (optional)" htmlFor="d-lic">
          <input id="d-lic" className={inputCls} value={license} onChange={(e) => setLicense(e.target.value)} placeholder="DOC-123" />
        </Field>
        <Field label="Photo URL *" htmlFor="d-photo" hint="Required. Shown on search results and bookings.">
          <div className="flex items-center gap-3">
            <Avatar src={photoUrl.trim() || null} firstName={firstName} lastName={lastName} size={48} />
            <input id="d-photo" className={inputCls} value={photoUrl} onChange={(e) => { setPhotoUrl(e.target.value); setErr(""); }} placeholder="/avatars/doctors/davit.svg or https://…" />
          </div>
        </Field>
        <PasswordInput id="d-pw" label="Password" value={password} onChange={(v) => { setPassword(v); setErr(""); }} autoComplete="new-password" />
        <PasswordRules password={password} />
        <PasswordInput id="d-confirm" label="Repeat password" value={confirm} onChange={(v) => { setConfirm(v); setErr(""); }} autoComplete="new-password" placeholder="Repeat password" />
        {(err || clientError) && <p className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-2.5 rounded-xl" role="alert">{err || clientError}</p>}
        <PrimaryButton disabled={!canSubmit} loading={loading}>Register</PrimaryButton>
        <p className="text-sm text-slate-600"><Link className="text-teal-700 font-semibold underline underline-offset-4" href="/login">Back to login</Link></p>
      </form>
    </Card></div>
  );
}
