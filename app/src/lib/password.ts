// Shared password rules — must mirror backend/app/schemas/auth.py
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (pw) => pw.length >= PASSWORD_MIN_LENGTH },
  { id: "lower", label: "One lowercase letter (a–z)", test: (pw) => /[a-z]/.test(pw) },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { id: "digit", label: "One digit (0–9)", test: (pw) => /\d/.test(pw) },
  { id: "symbol", label: "One symbol (!@#$…)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function passwordScore(pw: string): number {
  return PASSWORD_RULES.reduce((n, r) => n + (r.test(pw) ? 1 : 0), 0);
}

export function passwordStrengthLabel(pw: string): { label: string; color: string } {
  if (!pw) return { label: "", color: "bg-gray-200" };
  const s = passwordScore(pw);
  if (s <= 2) return { label: "Weak", color: "bg-red-500" };
  if (s <= 3) return { label: "Fair", color: "bg-yellow-500" };
  if (s <= 4) return { label: "Good", color: "bg-lime-500" };
  return { label: "Strong", color: "bg-green-600" };
}

export function validatePassword(pw: string): string | null {
  for (const r of PASSWORD_RULES) {
    if (!r.test(pw)) return r.label;
  }
  return null;
}
