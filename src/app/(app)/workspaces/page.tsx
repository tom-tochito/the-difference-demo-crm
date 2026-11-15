"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Ship, ArrowUpRight } from "lucide-react";
function Chooser() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (params.has("choose")) return;
    try {
      const w = localStorage.getItem("crm.workspace.v1");
      if (w === "shipping" || w === "charity")
        router.replace(w === "shipping" ? "/shipping" : "/dashboard");
    } catch {}
  }, [params, router]);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center p-6 sm:p-12">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-600">
        Two workspaces. One place.
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        Where are we working today?
      </h1>
      <p className="mt-3 text-zinc-500">
        Choose your workspace. Your records stay separate, and you can switch at
        any time.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {[
          {
            key: "charity",
            title: "The Difference",
            description: "Relationships that make a difference.",
            detail:
              "Contacts, organisations, fundraising and programme activity.",
            icon: Building2,
          },
          {
            key: "shipping",
            title: "Freight Operations",
            description: "From first enquiry to final delivery.",
            detail:
              "Quotes, bookings, shipments, export documents and finance.",
            icon: Ship,
          },
        ].map((w) => (
          <button
            key={w.key}
            onClick={() => {
              try {
                localStorage.setItem("crm.workspace.v1", w.key);
              } catch {}
              router.push(w.key === "shipping" ? "/shipping" : "/dashboard");
            }}
            className="group rounded-2xl border bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
          >
            <w.icon className="mb-8 size-10 text-indigo-600" />
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{w.title}</h2>
              <ArrowUpRight className="text-zinc-400 group-hover:text-indigo-600" />
            </div>
            <p className="mt-3 font-medium">{w.description}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{w.detail}</p>
          </button>
        ))}
      </div>
      <p className="mt-8 text-xs text-zinc-500">
        Shared demo accounts · Fictional data · No live external transactions
      </p>
    </div>
  );
}
export default function Page() {
  return (
    <Suspense>
      <Chooser />
    </Suspense>
  );
}
