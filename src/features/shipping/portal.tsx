"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Badge,
  date,
  Empty,
  inputClass,
  Panel,
  RouteVisual,
  Select,
  Timeline,
} from "./shared";
export function Portal() {
  const [customerId, setCustomerId] = useState<Id<"shippingCompanies">>();
  const [reference, setReference] = useState("");
  const [selected, setSelected] = useState("");
  const data = useQuery(api.shipping.portal, { customerId, reference });
  if (!data)
    return (
      <div className="p-8 text-sm text-zinc-600">Loading customer preview…</div>
    );
  const s = data.shipments.find((s) => s.id === selected) ?? data.shipments[0];
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
      <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800">
        <strong>Customer portal preview</strong> · Authenticated demonstration
        with a customer selector. This is not a public customer login.
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-600">
          Freight Operations / Customer view
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Your shipments, in view.
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Tracking milestones, approved shared documents and customer-visible
          updates.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Preview customer"
          value={data.selected ?? ""}
          onChange={(v) => {
            setCustomerId(v as Id<"shippingCompanies">);
            setSelected("");
          }}
          options={data.companies.map((c) => ({ value: c.id, label: c.name }))}
        />
        <label className="space-y-1 text-xs font-medium text-zinc-600">
          Tracking reference lookup
          <input
            className={inputClass}
            placeholder="e.g. SHP-OCEAN-APPROVAL"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
      </div>
      {data.shipments.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.shipments.map((row) => (
              <button
                key={row.id}
                onClick={() => setSelected(row.id)}
                className={`rounded-xl border p-4 text-left ${s?.id === row.id ? "border-indigo-300 bg-indigo-50/40" : "bg-white"}`}
              >
                <p className="text-sm font-semibold">{row.reference}</p>
                <p className="my-3 text-xs text-zinc-600">
                  {row.origin} → {row.destination}
                </p>
                <Badge>{row.status}</Badge>
              </button>
            ))}
          </div>
          {s && (
            <>
              <RouteVisual {...s} />
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel
                  title="Journey milestones"
                  action={
                    <span className="text-xs text-zinc-600">
                      ETA {date(s.eta)}
                    </span>
                  }
                >
                  <Timeline milestones={s.milestones} />
                  <p className="mt-5 text-xs text-zinc-600">
                    Last updated {date(s.updatedAt)} · Simulated tracking
                  </p>
                </Panel>
                <div className="space-y-5">
                  <Panel title="Shared documents">
                    {s.documents.length ? (
                      s.documents.map((d, i) => (
                        <div key={i} className="border-b py-3 last:border-0">
                          <p className="text-sm font-medium">{d.type}</p>
                          {d.url ? (
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 text-xs text-indigo-700 underline"
                            >
                              Preview / download
                            </a>
                          ) : (
                            <p className="mt-1 text-xs text-zinc-600">
                              Approved demo record · no attachment uploaded
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <Empty>No approved documents have been shared yet.</Empty>
                    )}
                  </Panel>
                  <Panel title="Recent updates">
                    {s.updates.length ? (
                      s.updates.slice(0, 8).map((u, i) => (
                        <div key={i} className="border-b py-3 last:border-0">
                          <p className="text-sm">{u.body}</p>
                          <p className="mt-1 text-xs text-zinc-600">
                            {date(u.happenedAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <Empty>No updates yet.</Empty>
                    )}
                  </Panel>
                </div>
              </div>
              <Button variant="outline" onClick={() => window.print()}>
                Print tracking summary
              </Button>
            </>
          )}
        </>
      ) : (
        <Empty>No shipments match this customer and tracking reference.</Empty>
      )}
    </div>
  );
}
