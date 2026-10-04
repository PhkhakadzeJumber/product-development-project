"use client";
import { useState } from "react";

function initials(first?: string | null, last?: string | null) {
  const a = (first ?? "").trim().charAt(0);
  const b = (last ?? "").trim().charAt(0);
  const s = `${a}${b}`.toUpperCase();
  return s || "?";
}

/** Facebook-style placeholder: image when available, initials circle otherwise (or on 404). */
export function Avatar({ src, firstName, lastName, size = 40 }: {
  src?: string | null; firstName?: string | null; lastName?: string | null; size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src!} alt={`${firstName ?? ""} ${lastName ?? ""}`.trim() || "avatar"}
        width={size} height={size} onError={() => setFailed(true)}
        className="rounded-full object-cover bg-gray-200" style={{ width: size, height: size }} />
    );
  }
  return (
    <div aria-label="avatar-placeholder"
      className="rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold select-none"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(firstName, lastName)}
    </div>
  );
}

/** Drug thumbnail: image when available, pill emoji fallback otherwise (or on 404). */
export function DrugImage({ src, name, size = 40 }: { src?: string | null; name?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name ?? "drug"} width={size} height={size}
        onError={() => setFailed(true)}
        className="rounded object-cover bg-amber-50 border" style={{ width: size, height: size }} />
    );
  }
  return (
    <div aria-label="drug-placeholder"
      className="rounded bg-amber-100 border flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.5 }}>💊</div>
  );
}
