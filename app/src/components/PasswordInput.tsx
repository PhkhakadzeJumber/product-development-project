"use client";
import { useState } from "react";
import { PASSWORD_RULES, passwordScore, passwordStrengthLabel } from "@/lib/password";

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder = "••••••••",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <input
          id={id}
          className="border p-2 w-full pr-16 rounded"
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 underline"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export function PasswordRules({ password }: { password: string }) {
  const score = passwordScore(password);
  const strength = passwordStrengthLabel(password);
  return (
    <div className="text-sm space-y-1" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 bg-gray-200 rounded overflow-hidden">
          <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(score / PASSWORD_RULES.length) * 100}%` }} />
        </div>
        {password && <span className="text-gray-600">{strength.label}</span>}
      </div>
      <ul className="space-y-0.5">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className={ok ? "text-green-700" : "text-gray-500"}>
              {ok ? "✓" : "○"} {r.label}
            </li>
          );
        })}
      </ul>
      <p className="text-gray-500 text-xs">Example: Test123! — avoid common passwords like password123.</p>
    </div>
  );
}
