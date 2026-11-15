"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowUpRight,
  PackageCheck,
  FileCheck2,
  Plus,
  Upload,
} from "lucide-react";
import {
  useClock,
  Action,
  Panel,
  Empty,
  Badge,
  date,
  money,
  Mode,
  RouteVisual,
  Timeline,
  inputClass,
  Select,
  Table,
} from "./shared";
import { DOCUMENT_TYPES, DAY } from "../../../convex/shippingModel";
import { clientHref } from "./navigation";
export function ClientWorkspace({
  section,
  previewCustomer,
}: {
  section: string;
  previewCustomer?: Id<"shippingCompanies">;
}) {
  const now = useClock();
  const data = useQuery(
    api.client.snapshot,
    previewCustomer ? { customerId: previewCustomer, now } : { now },
  );
  const params = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [docType, setDocType] = useState<string>(DOCUMENT_TYPES[0]);
  const submit = useMutation(api.client.submitEnquiry),
    accept = useMutation(api.client.acceptQuote),
    complete = useMutation(api.client.completeTask),
    begin = useMutation(api.client.beginUpload),
    finish = useMutation(api.client.finishUpload);
  if (!data)
    return (
      <div className="p-10 text-sm text-slate-600">
        Opening your client workspace…
      </div>
    );
  const id = params.get("id");
  const selected = ["shipments", "tracking", "documents", "portal"].includes(
    section,
  )
    ? data.shipments.find((s) => s._id === id)
    : undefined;
  const href = (view: string, query: Record<string, string> = {}) =>
    clientHref(view, query, previewCustomer);
  const filter = params.get("filter");
  const reviewQuotes = data.quotes.filter(
    (q) => ["Quote Sent", "Negotiation"].includes(q.stage) && q.validity >= now,
  );
  const openTasks = data.tasks.filter((t) => !t.done);
  const activeShipments = data.shipments
    .filter((s) => s.status !== "Delivered")
    .sort((a, b) => a.eta - b.eta);
  const needsDocuments = activeShipments.filter((s) =>
    data.requirements[s.mode].some(
      (type) =>
        !s.documents.some((d) => d.type === type && d.status === "Approved"),
    ),
  );
  const actions = [
    ...reviewQuotes.map((q) => ({
      key: q._id,
      label: `Review ${q.reference}`,
      detail: `${q.origin} → ${q.destination}`,
      due: q.validity,
      kind: "Quotation",
      href: href("quotes", { id: q._id }),
    })),
    ...openTasks.map((t) => ({
      key: t._id,
      label: t.title,
      detail: [
        data.shipments.find((s) => s._id === t.shipmentId)?.reference,
        t.assignee,
      ]
        .filter(Boolean)
        .join(" · "),
      due: t.dueAt,
      kind: "Task",
      href: href("tasks", { id: t._id }),
    })),
    ...needsDocuments.map((s) => ({
      key: s._id,
      label: `Check documents · ${s.reference}`,
      detail: `${s.origin} → ${s.destination}`,
      due: s.etd,
      kind: "Documents",
      href: href("documents", { id: s._id }),
    })),
  ].sort((a, b) => a.due - b.due);
  const allowed = [
    "overview",
    "enquiries",
    "quotes",
    "bookings",
    "shipments",
    "tracking",
    "documents",
    "tasks",
    "finance",
    "reports",
    "portal",
  ];
  if (!allowed.includes(section))
    return (
      <div className="p-10">
        <Empty>This section is available to the platform team.</Empty>
      </div>
    );
  const s =
    selected ??
    (section === "tracking" || section === "documents" || section === "portal"
      ? id
        ? undefined
        : (needsDocuments[0] ?? data.shipments[0])
      : undefined);
  const matches = (...values: string[]) =>
    values.join(" ").toLowerCase().includes(search.toLowerCase());
  const visibleQuotes = data.quotes.filter(
    (q) =>
      (!id || q._id === id) &&
      (filter !== "review" || reviewQuotes.some((r) => r._id === q._id)) &&
      matches(q.reference, q.origin, q.destination),
  );
  const page = Number(params.get("page") ?? 1);
  const setPage = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.replace(`?${next}`);
  };
  return (
    <div className="mx-auto max-w-[1440px] space-y-7 p-5 sm:p-8 xl:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {data.company.name} ·{" "}
            {data.role === "user" ? "Your assigned work" : "Client workspace"}
          </p>
          <h1 className="page-title">
            {s
              ? s.reference
              : ({
                  overview: "Your freight, all in one place.",
                  enquiries: "Your requests",
                  quotes: "Quotes & bookings",
                  bookings: "Quotes & bookings",
                  shipments: "Your shipments",
                  tracking: "Follow every movement",
                  documents: "Documents & readiness",
                  tasks: "Your next actions",
                  finance: "Invoices & balances",
                  reports: "Your invoices",
                  portal: "Your freight, all in one place.",
                }[section] ?? "Your workspace")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            {s
              ? `${s.origin} → ${s.destination}`
              : "From your first request to the final invoice. Everything your team needs to keep freight moving."}
          </p>
        </div>
        {!previewCustomer && ["overview", "enquiries"].includes(section) && (
          <Button onClick={() => setCreate((v) => !v)}>
            <Plus className="size-4" />
            Request a quote
          </Button>
        )}
      </div>
      {create && (
        <Panel title="Tell us what needs to move">
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const f = new FormData(e.currentTarget);
              try {
                await submit({
                  origin: String(f.get("origin")),
                  destination: String(f.get("destination")),
                  cargo: String(f.get("cargo")),
                  mode: String(f.get("mode")) as "sea" | "air" | "road",
                  weightKg: Number(f.get("weight")),
                  volumeM3: Number(f.get("volume")),
                  packages: Number(f.get("packages")),
                  etd: Date.parse(String(f.get("departure"))),
                  eta: Date.parse(String(f.get("arrival"))),
                  currency: String(f.get("currency")) as "GBP" | "EUR" | "USD",
                });
                toast.success("Request sent to the platform team");
                setCreate(false);
                router.push(href("enquiries"));
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Could not submit",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {[
              {
                title: "Route & timing",
                fields: [
                  ["origin", "Origin", "text", ""],
                  ["destination", "Destination", "text", ""],
                  [
                    "departure",
                    "Requested departure",
                    "date",
                    new Date(now + 7 * DAY).toISOString().slice(0, 10),
                  ],
                  [
                    "arrival",
                    "Requested arrival",
                    "date",
                    new Date(now + 35 * DAY).toISOString().slice(0, 10),
                  ],
                ],
              },
              {
                title: "Your cargo",
                fields: [
                  ["cargo", "Cargo description", "text", ""],
                  ["packages", "Packages", "number", "8"],
                  ["weight", "Gross weight (kg)", "number", "1200"],
                  ["volume", "Volume (m³)", "number", "8"],
                ],
              },
            ].map((group) => (
              <fieldset key={group.title}>
                <legend className="mb-4 text-sm font-semibold text-slate-900">
                  {group.title}
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.fields.map(([name, label, type, value]) => (
                    <label className="field-label" key={name}>
                      {label}
                      <input
                        className={inputClass}
                        name={name}
                        type={type}
                        defaultValue={value}
                        required
                        min={
                          type === "number"
                            ? name === "volume"
                              ? "0"
                              : "1"
                            : undefined
                        }
                        step={name === "packages" ? "1" : "any"}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset>
              <legend className="mb-4 text-sm font-semibold text-slate-900">
                Service preferences
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  Transport mode
                  <select className={inputClass} name="mode">
                    <option value="sea">Sea</option>
                    <option value="air">Air</option>
                    <option value="road">Road</option>
                  </select>
                </label>
                <label className="field-label">
                  Currency
                  <select className={inputClass} name="currency">
                    <option>GBP</option>
                    <option>EUR</option>
                    <option>USD</option>
                  </select>
                </label>
              </div>
            </fieldset>
            <div className="flex items-end gap-2 border-t pt-5">
              <Button disabled={busy}>
                {busy ? "Submitting…" : "Send request"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreate(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}
      {section === "overview" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Active shipments",
                count: activeShipments.length,
                view: "shipments",
                filter: "active",
              },
              {
                label: "Quotes awaiting approval",
                count: reviewQuotes.length,
                view: "quotes",
                filter: "review",
              },
              {
                label: "Open tasks",
                count: openTasks.length,
                view: "tasks",
                filter: "open",
              },
            ].map((card) => (
              <Link
                href={href(card.view, { filter: card.filter })}
                key={card.view}
                className="metric-card transition-colors hover:border-teal-500"
              >
                <span className="text-xs font-medium text-slate-600">
                  {card.label}
                </span>
                <div className="mt-5 flex items-end justify-between">
                  <strong className="text-4xl font-medium tracking-tight">
                    {card.count}
                  </strong>
                  <ArrowUpRight className="size-4 text-teal-700" />
                </div>
              </Link>
            ))}
          </div>
          <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
            <Panel
              title="Shipments in progress"
              action={
                <Link
                  className="text-xs font-medium text-teal-800"
                  href={href("shipments")}
                >
                  View all →
                </Link>
              }
            >
              {activeShipments.length ? (
                <div className="divide-y">
                  {activeShipments.slice(0, 5).map((s) => (
                    <Link
                      href={href("shipments", { id: s._id })}
                      key={s._id}
                      className="group block py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-800">
                          {s.reference}
                        </p>
                        <Badge>{s.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {s.origin} → {s.destination}
                      </p>
                      <p className="mt-3 text-xs text-slate-600">
                        Expected arrival {date(s.eta)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty>
                  No shipments in progress. Your next movement will appear here.
                </Empty>
              )}
            </Panel>
            <Panel
              title="Needs your attention"
              action={
                <Link
                  className="text-xs font-medium text-teal-800"
                  href={href("tasks", { filter: "open" })}
                >
                  All tasks →
                </Link>
              }
            >
              {actions.length ? (
                <div className="divide-y">
                  {actions.slice(0, 6).map((a) => (
                    <Link
                      key={a.key}
                      href={a.href}
                      className="block py-4 first:pt-0 last:pb-0"
                    >
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-teal-700">
                        {a.kind} · {date(a.due)}
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {a.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{a.detail}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty>
                  You’re up to date. Anything needing your attention will appear
                  here.
                </Empty>
              )}
            </Panel>
          </div>
        </>
      )}
      {["quotes", "bookings"].includes(section) && (
        <nav
          aria-label="Quotes and bookings"
          className="flex gap-1 border-b border-slate-200"
        >
          {[
            ["quotes", "Quotations"],
            ["bookings", "Bookings"],
          ].map(([view, label]) => (
            <Link
              key={view}
              href={href(view)}
              aria-current={section === view ? "page" : undefined}
              className={`border-b-2 px-5 py-3 text-sm font-medium ${section === view ? "border-teal-700 text-teal-800" : "border-transparent text-slate-600 hover:text-slate-900"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      {filter && (
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <Badge>
            {filter === "review"
              ? "Awaiting approval"
              : filter === "active"
                ? "Active shipments"
                : "Open tasks"}
          </Badge>
          <Link className="underline" href={href(section)}>
            Clear filter
          </Link>
        </div>
      )}
      {!s && section !== "overview" && (
        <label className="field-label max-w-md">
          Search your records
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference, route or description…"
          />
        </label>
      )}
      {section === "enquiries" && (
        <Table
          page={page}
          onPage={setPage}
          rows={data.enquiries.filter(
            (e) =>
              (!id || e._id === id) &&
              matches(e.reference, e.origin, e.destination),
          )}
          columns={[
            { label: "Request", render: (e) => <strong>{e.reference}</strong> },
            {
              label: "Route",
              render: (e) => (
                <>
                  {e.origin} → {e.destination}
                  <p className="mt-1 text-xs text-slate-600">{e.cargo}</p>
                </>
              ),
            },
            { label: "Mode", render: (e) => <Mode mode={e.mode} /> },
            { label: "Progress", render: (e) => <Badge>{e.stage}</Badge> },
          ]}
        />
      )}
      {section === "quotes" && (
        <div className="space-y-4">
          {visibleQuotes.map((q) => (
            <Panel
              key={q._id}
              title={q.reference}
              action={<Badge>{q.stage}</Badge>}
            >
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="text-sm">
                    {q.origin} → {q.destination}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    Valid until {date(q.validity)}
                  </p>
                </div>
                <strong className="text-2xl font-medium">
                  {money(q.total, q.currency)}
                </strong>
              </div>
              <div className="my-5 divide-y">
                {q.charges.map((c, i) => (
                  <div
                    key={i}
                    className="flex justify-between gap-3 py-2 text-xs"
                  >
                    <span>
                      {c.description} × {c.quantity}
                    </span>
                    <span>
                      {money(Math.round(c.quantity * c.unitMinor), q.currency)}
                    </span>
                  </div>
                ))}
              </div>
              {previewCustomer ? (
                <p className="text-xs text-slate-600">
                  Read-only preview · Client admins approve quotations.
                </p>
              ) : data.role === "user" ? (
                <p className="text-xs text-slate-600">
                  Your client admin approves quotations.
                </p>
              ) : (
                <Action
                  disabled={
                    !["Quote Sent", "Negotiation", "Won"].includes(q.stage) ||
                    (q.stage !== "Won" && q.validity < now)
                  }
                  onClick={async () => {
                    const bookingId = await accept({ id: q._id });
                    router.push(href("bookings", { id: bookingId }));
                  }}
                >
                  {q.stage === "Won"
                    ? "Open accepted booking"
                    : "Accept quote & book"}
                </Action>
              )}
            </Panel>
          ))}
          {!visibleQuotes.length && (
            <Empty>No quotations match this view.</Empty>
          )}
        </div>
      )}
      {section === "bookings" && (
        <Table
          page={page}
          onPage={setPage}
          rows={data.bookings.filter(
            (b) =>
              (!id || b._id === id) &&
              matches(b.reference, b.origin, b.destination),
          )}
          columns={[
            {
              label: "Booking",
              render: (b) => (
                <>
                  <strong>{b.reference}</strong>
                  {b.quoteId &&
                    data.quotes.some((q) => q._id === b.quoteId) && (
                      <Link
                        className="mt-1 block text-xs text-teal-800 underline"
                        href={href("quotes", { id: b.quoteId })}
                      >
                        View quote
                      </Link>
                    )}
                </>
              ),
            },
            {
              label: "Route",
              render: (b) => (
                <>
                  {b.origin} → {b.destination}
                </>
              ),
            },
            {
              label: "Shipment",
              render: (b) => {
                const shipment = data.shipments.find(
                  (s) => s.bookingId === b._id,
                );
                return shipment ? (
                  <Link
                    className="inline-flex min-h-8 items-center whitespace-nowrap text-xs font-medium text-teal-800 underline"
                    href={href("shipments", { id: shipment._id })}
                  >
                    {shipment.reference}
                  </Link>
                ) : (
                  <span className="text-xs text-slate-600">
                    Awaiting shipment
                  </span>
                );
              },
            },
            {
              label: "Agreed price",
              render: (b) => money(b.total, b.currency),
            },
            {
              label: "Status",
              render: (b) => (
                <Badge>
                  {b.confirmed
                    ? "Confirmed (demo)"
                    : "Awaiting platform confirmation"}
                </Badge>
              ),
            },
          ]}
        />
      )}
      {section === "shipments" &&
        !s &&
        (id ? (
          <Empty>This shipment is not available to your account.</Empty>
        ) : (
          <Table
            page={page}
            onPage={setPage}
            rows={data.shipments.filter(
              (s) =>
                (filter !== "active" || s.status !== "Delivered") &&
                matches(s.reference, s.origin, s.destination),
            )}
            columns={[
              {
                label: "Shipment",
                render: (s) => (
                  <Link
                    className="inline-flex min-h-8 items-center whitespace-nowrap font-semibold text-teal-800"
                    href={href("shipments", { id: s._id })}
                  >
                    {s.reference}
                  </Link>
                ),
              },
              {
                label: "Route",
                render: (s) => (
                  <>
                    {s.origin} → {s.destination}
                  </>
                ),
              },
              { label: "Mode", render: (s) => <Mode mode={s.mode} /> },
              { label: "ETA", render: (s) => date(s.eta) },
              { label: "Status", render: (s) => <Badge>{s.status}</Badge> },
            ]}
          />
        ))}
      {s && (
        <>
          {["documents", "tracking", "portal"].includes(section) && (
            <Select
              label="Shipment"
              value={s._id}
              onChange={(v) => router.replace(href(section, { id: v }))}
              options={data.shipments.map((s) => ({
                value: s._id,
                label: s.reference,
              }))}
            />
          )}
          <Link
            href={href("shipments")}
            className="inline-flex text-xs font-medium text-teal-800"
          >
            ← All shipments
          </Link>
          <RouteVisual {...s} />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Expected arrival
              </p>
              <p className="mt-1 font-semibold">{date(s.eta)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Cargo
              </p>
              <p className="mt-1">{s.cargo}</p>
            </div>
            {s.bookingId &&
              data.bookings.some((b) => b._id === s.bookingId) && (
                <Link
                  className="inline-flex min-h-8 items-center whitespace-nowrap text-xs font-medium text-teal-800 underline"
                  href={href("bookings", { id: s.bookingId })}
                >
                  View booking
                </Link>
              )}
            {data.invoices
              .filter((i) => i.shipmentId === s._id)
              .map((i) => (
                <Link
                  key={i._id}
                  className="inline-flex min-h-8 items-center whitespace-nowrap text-xs font-medium text-teal-800 underline"
                  href={href("finance", { id: i._id })}
                >
                  {i.reference}
                </Link>
              ))}
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel
              title="Journey milestones"
              action={<PackageCheck className="size-4 text-teal-700" />}
            >
              <Timeline milestones={s.milestones} />
              <p className="mt-5 text-xs text-slate-600">
                Last update {date(s.updatedAt)} · Simulated tracking
              </p>
            </Panel>
            <div className="min-w-0 space-y-6">
              <Panel
                title="Documents & readiness"
                action={<FileCheck2 className="size-4 text-teal-700" />}
              >
                <p className="mb-4 text-xs leading-5 text-slate-600">
                  Example requirements: {data.requirements[s.mode].join(", ")}.
                  Approval is handled by the platform team.
                </p>
                {s.documents.map((d) => (
                  <div
                    key={d._id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t py-3 text-sm"
                  >
                    <span>{d.type}</span>
                    <Badge>{d.status}</Badge>
                    {d.url && (
                      <a
                        className="inline-flex min-h-8 items-center whitespace-nowrap text-xs font-medium text-teal-800 underline"
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview / download
                      </a>
                    )}
                  </div>
                ))}
                {!previewCustomer && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <Select
                      label="Document type"
                      value={docType}
                      onChange={setDocType}
                      options={[...DOCUMENT_TYPES]}
                    />
                    <label className="flex cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-dashed border-teal-300 bg-teal-50/50 p-4 text-xs font-medium text-teal-800">
                      <Upload className="size-4" />
                      {busy ? "Uploading…" : "Upload for platform review"}
                      <input
                        className="w-full min-w-0 text-[11px] sm:w-auto sm:flex-1"
                        aria-label="Upload document"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                        disabled={busy}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error("Use files up to 10 MB");
                            return;
                          }
                          setBusy(true);
                          try {
                            const grant = await begin({
                              shipmentId: s._id,
                              type: docType as (typeof DOCUMENT_TYPES)[number],
                            });
                            const result = await fetch(grant.url, {
                              method: "POST",
                              headers: {
                                "Content-Type": file.type || "text/plain",
                              },
                              body: file,
                            });
                            if (!result.ok) throw new Error("Upload failed");
                            const body = (await result.json()) as {
                              storageId?: string;
                            };
                            if (!body.storageId)
                              throw new Error("Upload response missing file");
                            const storageId = body.storageId as Id<"_storage">;
                            await finish({
                              grantId: grant.grantId,
                              storageId,
                              filename: file.name,
                            });
                            toast.success("Uploaded for review");
                          } catch (err) {
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : "Upload failed",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    </label>
                    <p className="text-[11px] text-slate-600">
                      PDF, PNG, JPEG or text · Maximum 10 MB
                    </p>
                  </div>
                )}
              </Panel>
              <Panel
                title="Related tasks"
                action={
                  <Link
                    className="text-xs font-medium text-teal-800"
                    href={href("tasks", { shipment: s._id })}
                  >
                    View tasks →
                  </Link>
                }
              >
                {data.tasks.filter((t) => t.shipmentId === s._id).length ? (
                  data.tasks
                    .filter((t) => t.shipmentId === s._id)
                    .map((t) => (
                      <Link
                        key={t._id}
                        href={href("tasks", { id: t._id })}
                        className="flex flex-wrap items-center justify-between gap-2 border-b py-3 text-sm last:border-0"
                      >
                        <span>
                          {t.title}
                          <span className="mt-1 block text-xs text-slate-600">
                            {t.assignee} · {date(t.dueAt)}
                          </span>
                        </span>
                        <Badge>{t.done ? "Complete" : "Open"}</Badge>
                      </Link>
                    ))
                ) : (
                  <Empty>No tasks for this shipment.</Empty>
                )}
              </Panel>
              <Panel title="Customer updates">
                {s.updates.length ? (
                  s.updates.map((u, i) => (
                    <div className="border-b py-3 last:border-0" key={i}>
                      <p className="text-sm leading-6">{u.body}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {date(u.happenedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <Empty>No public updates yet.</Empty>
                )}
              </Panel>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            Print tracking summary
          </Button>
        </>
      )}
      {["tracking", "documents", "portal"].includes(section) && !s && (
        <Empty>
          {id
            ? "This shipment is not available to your account."
            : "No shipments assigned to this account."}
        </Empty>
      )}
      {section === "tasks" && (
        <>
          {!previewCustomer && (
            <label className="field-label max-w-xl">
              Completion note
              <input
                className={inputClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was completed?"
              />
            </label>
          )}
          <Table
            page={page}
            onPage={setPage}
            rows={data.tasks.filter(
              (t) =>
                (!id || t._id === id) &&
                (!params.get("shipment") ||
                  t.shipmentId === params.get("shipment")) &&
                (filter !== "open" || !t.done) &&
                matches(t.title, t.assignee),
            )}
            columns={[
              {
                label: "Task",
                render: (t) => (
                  <>
                    {t.title}
                    <p className="mt-1 text-xs text-slate-600">{t.assignee}</p>
                  </>
                ),
              },
              { label: "Deadline", render: (t) => date(t.dueAt) },
              { label: "Priority", render: (t) => <Badge>{t.priority}</Badge> },
              {
                label: "Action",
                render: (t) =>
                  t.done ? (
                    <Badge>Complete</Badge>
                  ) : previewCustomer ? (
                    <Badge>Open</Badge>
                  ) : (
                    <Action
                      disabled={!note.trim()}
                      onClick={() => complete({ id: t._id, resolution: note })}
                    >
                      Complete task
                    </Action>
                  ),
              },
            ]}
          />
        </>
      )}
      {["finance", "reports"].includes(section) && (
        <Table
          page={page}
          onPage={setPage}
          rows={data.invoices.filter(
            (i) => (!id || i._id === id) && matches(i.reference),
          )}
          columns={[
            {
              label: "Invoice",
              render: (i) => (
                <>
                  <strong>{i.reference}</strong>
                  {data.shipments.some((s) => s._id === i.shipmentId) && (
                    <Link
                      className="mt-1 block text-xs text-teal-800 underline"
                      href={href("shipments", { id: i.shipmentId })}
                    >
                      View shipment
                    </Link>
                  )}
                </>
              ),
            },
            { label: "Total", render: (i) => money(i.total, i.currency) },
            { label: "Paid", render: (i) => money(i.paid, i.currency) },
            {
              label: "Outstanding",
              render: (i) => money(i.balance, i.currency),
            },
            { label: "Due", render: (i) => date(i.dueAt) },
            { label: "Status", render: (i) => <Badge>{i.status}</Badge> },
          ]}
        />
      )}
      <p className="pt-3 text-[10px] leading-5 text-slate-600">
        Freight Operations · Demonstration · No live bookings or payments
      </p>
    </div>
  );
}
