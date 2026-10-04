"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CatalogApi } from "@/lib/api";
import { DrugImage } from "@/components/Avatar";
import { Card, StatusPill, EmptyState, Skeleton, inputCls } from "@/components/ui";

function useDebounced(value: string, delay = 300): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function DrugsPage() {
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 300);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["drugs", q],
    queryFn: () => CatalogApi.drugs(q || undefined),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Drugs</h1>
        <p className="text-slate-500 mt-1">Browse medications, then open a drug for full details.{isFetching && !isLoading ? " …" : ""}</p>
      </div>
      <Card className="p-4">
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="Search drugs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search drugs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-sm font-semibold px-4 rounded-xl shrink-0 border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </Card>
      {isLoading ? <div className="grid sm:grid-cols-2 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      : !data?.length ? <Card><EmptyState title="No drugs found" hint="Try another search." /></Card>
      : <div className="grid sm:grid-cols-2 gap-4">{data.map((drug) => (
        <Card key={drug.drug_id} className="p-4 flex gap-4">
          <DrugImage src={drug.image_url} name={drug.name} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/drugs/${drug.drug_id}`} className="font-bold hover:text-teal-700 hover:underline">
                {drug.name}{drug.strength ? ` · ${drug.strength}` : ""}
              </Link>
              {drug.form && <StatusPill status={drug.form} />}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{drug.generic_name ?? ""}</p>
            {drug.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{drug.description}</p>}
            <Link href={`/drugs/${drug.drug_id}`} className="inline-block mt-2 text-sm font-semibold text-teal-700 hover:underline">View details →</Link>
          </div>
        </Card>
      ))}</div>}
    </div>
  );
}
