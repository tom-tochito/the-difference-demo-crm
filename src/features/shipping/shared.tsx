"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Ship,
  Plane,
  Truck,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
export type Data = FunctionReturnType<typeof api.shipping.overview>;
export const ShippingContext = createContext<{
  data: Data;
  now: number;
} | null>(null);
export function useShipping() {
  const c = useContext(ShippingContext);
  if (!c) throw new Error("Shipping context missing");
  return c;
}
export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
export function money(n: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    n / 100,
  );
}
export function date(n?: number) {
  return n
    ? new Date(n).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Europe/London",
      })
    : "—";
}
export function dayInput(n?: number) {
  return n ? new Date(n).toISOString().slice(0, 10) : "";
}
export function company(data: Data, id: string) {
  return data.companies.find((c) => c._id === id)?.name ?? "Unknown customer";
}
export function shipment(data: Data, id: string) {
  return data.shipments.find((s) => s._id === id)?.reference ?? "Shipment";
}
export function readiness(data: Data, s: Doc<"shippingShipments">) {
  const types = data.settings.requirements[s.mode];
  const ready = types.filter((type) =>
    data.documents.some(
      (d) =>
        d.shipmentId === s._id && d.type === type && d.status === "Approved",
    ),
  ).length;
  return {
    ready,
    total: types.length,
    missing: types.filter(
      (type) =>
        !data.documents.some(
          (d) =>
            d.shipmentId === s._id &&
            d.type === type &&
            d.status === "Approved",
        ),
    ),
  };
}
export const inputClass =
  "h-10 w-full min-w-0 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-500";
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <label className="flex min-w-32 flex-col gap-1 text-xs font-medium text-zinc-600">
      {label}
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          return (
            <option key={v} value={v}>
              {typeof o === "string" ? o : o.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  const s = String(children);
  const color = /Missing|Overdue|Lost|High|delay/i.test(s)
    ? "bg-rose-50 text-rose-700 ring-rose-100"
    : /Delivered|Paid|Won|Approved|Complete/i.test(s)
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : /Draft|Planning|New|Low/i.test(s)
        ? "bg-zinc-100 text-zinc-600 ring-zinc-200"
        : "bg-teal-50 text-teal-700 ring-teal-100";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${color}`}
    >
      {children}
    </span>
  );
}
export function Mode({ mode }: { mode: string }) {
  const Icon = mode === "sea" ? Ship : mode === "air" ? Plane : Truck;
  return (
    <span className="inline-flex items-center gap-1.5 capitalize">
      <Icon className="size-3.5" />
      {mode}
    </span>
  );
}
export function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-zinc-200 bg-white shadow-sm ${className}`}
    >
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <h2 className="font-semibold tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
export function Empty({
  children = "No records match this view.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-zinc-600">
      {children}
    </div>
  );
}
export function Action({
  children,
  onClick,
  variant = "outline",
  disabled,
}: {
  children: ReactNode;
  onClick: () => Promise<unknown>;
  variant?: "outline" | "default" | "destructive";
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
          toast.success("Saved successfully");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Working…" : children}
    </Button>
  );
}
export function RecordLink({
  section,
  id,
  children,
}: {
  section: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <Link
      className="font-medium text-teal-700 hover:underline"
      href={`/shipping/${section}?id=${encodeURIComponent(id)}`}
    >
      {children}
    </Link>
  );
}
export function RouteVisual({
  origin,
  destination,
  stops,
  mode,
  status,
}: {
  origin: string;
  destination: string;
  stops: string;
  mode: string;
  status: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#132b39] p-6 text-white">
      <div className="flex justify-between text-xs text-teal-200">
        <Mode mode={mode} />
        <span>{status}</span>
      </div>
      <svg
        viewBox="0 0 600 90"
        role="img"
        aria-label={`Route from ${origin}${stops ? ` via ${stops}` : ""} to ${destination}`}
        className="mt-3 h-24 w-full"
      >
        <defs>
          <linearGradient id="route-line">
            <stop stopColor="#2a8b82" />
            <stop offset="1" stopColor="#6ee7b7" />
          </linearGradient>
        </defs>
        <path
          d="M25 70 Q300 -45 575 70"
          fill="none"
          stroke="url(#route-line)"
          strokeWidth="2"
          strokeDasharray="5 6"
        />
        <circle cx="25" cy="70" r="6" fill="#2a8b82" />
        <circle cx="575" cy="70" r="6" fill="#6ee7b7" />
        {stops && <circle cx="300" cy="12" r="5" fill="#d4d4d8" />}
      </svg>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-300">
            Origin
          </p>
          <p className="mt-1 text-lg font-semibold">{origin}</p>
        </div>
        {stops && (
          <p className="max-w-32 text-center text-xs text-zinc-300">
            Via {stops}
          </p>
        )}
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-zinc-300">
            Destination
          </p>
          <p className="mt-1 text-lg font-semibold">{destination}</p>
        </div>
      </div>
    </div>
  );
}
export function Timeline({
  milestones,
}: {
  milestones: { name: string; planned: number; actual?: number }[];
}) {
  return (
    <ol className="space-y-0">
      {milestones.map((m, i) => (
        <li key={m.name} className="relative flex gap-3 pb-6 last:pb-0">
          {i < milestones.length - 1 && (
            <span className="absolute left-[9px] top-5 h-full w-px bg-zinc-200" />
          )}
          {m.actual ? (
            <CheckCircle2 className="relative size-5 shrink-0 bg-white text-emerald-600" />
          ) : (
            <Circle className="relative size-5 shrink-0 bg-white text-zinc-300" />
          )}
          <div className="flex flex-1 flex-wrap justify-between gap-2 text-sm">
            <span className="font-medium">{m.name}</span>
            <span className="text-right text-xs text-zinc-600">
              Planned {date(m.planned)}
              {m.actual && (
                <span className="block text-emerald-700">
                  Actual {date(m.actual)}
                </span>
              )}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function Table<T>({
  rows,
  columns,
  page = 1,
  onPage,
}: {
  rows: T[];
  columns: { label: string; render: (r: T) => ReactNode }[];
  page?: number;
  onPage?: (n: number) => void;
}) {
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {!rows.length ? (
        <div className="p-5">
          <Empty />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-zinc-50">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.label}
                      className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice((current - 1) * pageSize, current * pageSize)
                  .map((r, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 hover:bg-zinc-50/70"
                    >
                      {columns.map((c) => (
                        <td key={c.label} className="px-4 py-4 align-middle">
                          {c.render(r)}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-zinc-600">
            <span>
              {rows.length} records · Page {current} of {pages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={current === 1 || !onPage}
                onClick={() => onPage?.(current - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={current === pages || !onPage}
                onClick={() => onPage?.(current + 1)}
              >
                Next <ArrowRight className="size-3" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export function ActivityList({
  items,
}: {
  items: {
    _id: string;
    body: string;
    author: string;
    happenedAt: number;
    public: boolean;
  }[];
}) {
  return (
    <div className="divide-y">
      {items.length ? (
        items.slice(0, 20).map((a) => (
          <div key={a._id} className="py-3 first:pt-0">
            <p className="text-sm leading-6">{a.body}</p>
            <p className="mt-1 text-xs text-zinc-600">
              {a.author} · {date(a.happenedAt)} ·{" "}
              {a.public ? "Customer visible" : "Internal"}
            </p>
          </div>
        ))
      ) : (
        <Empty>No activity yet.</Empty>
      )}
    </div>
  );
}
export function DocumentDownload({
  id,
}: {
  id: Doc<"shippingDocuments">["_id"];
}) {
  const url = useQuery(api.shipping.documentUrl, { id });
  return url ? (
    <a
      className="text-sm font-medium text-teal-700 underline"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      Open / download attachment
    </a>
  ) : (
    <span className="text-xs text-zinc-600">Generated demo document</span>
  );
}
