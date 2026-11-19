import Link from "next/link";

// Shared frame for every patient screen (/p/[token]/...): header and bottom navigation, as in the Figma MVP frames.
export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const home = `/p/${token}`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-xl font-bold leading-none text-white">
            +
          </span>
          <span className="text-lg font-bold text-brand-dark">MediBook</span>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide text-slate-500">
          PATIENT
        </span>
      </header>

      <main className="flex flex-1 flex-col bg-slate-50">{children}</main>

      <nav className="sticky bottom-0 grid grid-cols-2 border-t border-slate-200 bg-white py-2 text-xs font-medium">
        <Link href={home} className="flex flex-col items-center gap-1 text-brand-dark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
          Find doctor
        </Link>
        <Link href={`${home}#my-questions`} className="flex flex-col items-center gap-1 text-slate-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          </svg>
          My questions
        </Link>
      </nav>
    </div>
  );
}
