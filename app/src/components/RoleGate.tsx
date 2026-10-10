"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/types/api";
import { Card, EmptyState } from "@/components/ui";

const ROLE_LABEL: Record<UserRole, string> = {
  PATIENT: "patients",
  DOCTOR: "doctors",
  HOSPITAL_ADMIN: "hospital admins",
};

/** Renders children only for the allowed roles; otherwise a uniform
 *  "Access denied" card. Unknown (still-loading) role renders children,
 *  matching the previous behavior — the backend remains the real guard. */
export function RoleGate({ allow, children }: { allow: UserRole[]; children: React.ReactNode }) {
  const { role } = useAuth();
  if (role && !allow.includes(role)) {
    const who = allow.map((r) => ROLE_LABEL[r]).join(" and ");
    return (
      <Card className="p-6 text-center">
        <EmptyState title="Access denied" hint={`This page is for ${who}.`} />
        <Link href="/" className="inline-block mt-2 text-sm font-semibold text-teal-700 hover:underline">
          ← Back to home
        </Link>
      </Card>
    );
  }
  return <>{children}</>;
}
