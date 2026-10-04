export const TZ = "Asia/Tbilisi";

export function fmtDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

export function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch { return iso; }
}

export function dayKey(iso: string): string {
  try {
    const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: TZ }));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch { return iso.slice(0, 10); }
}

export function fmtDay(key: string): string {
  try {
    const [y, m, d] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(y, m - 1, d));
  } catch { return key; }
}

export function timeKey(iso: string): string {
  return fmtTime(iso);
}
