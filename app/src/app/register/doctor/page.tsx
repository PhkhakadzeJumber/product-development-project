"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthApi, CatalogApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import type { Hospital, Specialization } from "@/types/api";
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

export default function RegisterDoctorPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [license, setLicense] = useState("");
  const [hospitalIds, setHospitalIds] = useState<number[]>([]);
  const [hospitalSearch, setHospitalSearch] = useState("");
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

  const filteredHospitals = useMemo(() => {
    const q = hospitalSearch.trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter((h) =>
      h.name.toLowerCase().includes(q) || (h.city ?? "").toLowerCase().includes(q));
  }, [hospitals, hospitalSearch]);

  function toggleHospital(id: number) {
    setHospitalIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setErr("");
  }

  const selectedHospitals = useMemo(
    () => hospitals.filter((h) => hospitalIds.includes(h.hospital_id)),
    [hospitals, hospitalIds]);

  const clientError =
    email && !EMAIL_RE.test(email.trim()) ? "Enter a valid email address."
    : phone && !validPhone(phone) ? "Enter a valid phone number."
    : hospitalIds.length === 0 ? null // shown only on submit, not while typing
    : password && validatePassword(password) ? validatePassword(password)
    : confirm && password !== confirm ? "Passwords do not match."
    : null;

  const canSubmit = EMAIL_RE.test(email.trim()) && validPhone(phone) && firstName.trim() && lastName.trim() &&
    hospitalIds.length > 0 && password && confirm && !clientError && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (hospitalIds.length === 0) { setErr("Select at least one hospital you work in."); return; }
    if (!canSubmit) { setErr(clientError ?? "Fill in all required fields."); return; }
    setLoading(true);
    try {
      const t = await AuthApi.registerDoctor({
        email: email.trim().toLowerCase(), phone: phone.trim(), password,
        first_name: firstName.trim(), last_name: lastName.trim(),
        hospital_ids: hospitalIds, hospital_id: hospitalIds[0],
        specialization_id: specId ? Number(specId) : null,
        license_number: license.trim() || null,
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
        <div><h1 className="text-2xl font-bold">Doctor registration</h1>
        <p className="text-sm text-slate-500 mt-1">Your profile photo can be added later — you&apos;ll show with initials until then.</p></div>
        <Field label="Email" htmlFor="d-email">
          <input id="d-email" className={inputCls} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="doctor@example.com" autoComplete="email" />
        </Field>
        <Field label="Phone *" htmlFor="d-phone">
          <input id="d-phone" className={inputCls} type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErr(""); }} placeholder="+995 555 00 00 00" autoComplete="tel" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="d-first">
            <input id="d-first" className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Gio" autoComplete="given-name" />
          </Field>
          <Field label="Last name" htmlFor="d-last">
            <input id="d-last" className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Kapanadze" autoComplete="family-name" />
          </Field>
        </div>
        <Field label="Hospitals you work in *" htmlFor="d-hospital-search" hint="You can select more than one.">
          <input id="d-hospital-search" className={inputCls} value={hospitalSearch}
            onChange={(e) => setHospitalSearch(e.target.value)} placeholder="Search hospitals…" />
          {selectedHospitals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2" aria-live="polite">
              {selectedHospitals.map((h) => (
                <button key={h.hospital_id} type="button" onClick={() => toggleHospital(h.hospital_id)}
                  title="Remove"
                  className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-teal-100">
                  {h.name} <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 border border-slate-200 rounded-xl divide-y max-h-48 overflow-y-auto" role="group" aria-label="Hospitals">
            {filteredHospitals.length === 0 && (
              <p className="text-sm text-slate-500 p-3">No hospitals match your search.</p>
            )}
            {filteredHospitals.map((h) => {
              const checked = hospitalIds.includes(h.hospital_id);
              return (
                <label key={h.hospital_id}
                  className={`flex items-center gap-3 p-2.5 cursor-pointer text-sm transition ${checked ? "bg-teal-50/60" : "hover:bg-slate-50"}`}>
                  <input type="checkbox" className="accent-teal-600 w-4 h-4 shrink-0"
                    checked={checked} onChange={() => toggleHospital(h.hospital_id)} />
                  <span className="font-medium text-slate-800">{h.name}</span>
                  {h.city && <span className="text-slate-500 text-xs ml-auto">{h.city}</span>}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {hospitalIds.length === 0 ? "Select at least one hospital." : `${hospitalIds.length} hospital${hospitalIds.length > 1 ? "s" : ""} selected.`}
          </p>
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
