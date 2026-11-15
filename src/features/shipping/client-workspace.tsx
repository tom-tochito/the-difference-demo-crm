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
  ArrowRight,
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
  const selected = data.shipments.find((s) => s._id === id);
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
      ? data.shipments[0]
      : undefined);
  const matches = (...values: string[]) =>
    values.join(" ").toLowerCase().includes(search.toLowerCase());
  const page = Number(params.get("page") ?? 1);
  const setPage = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.replace(`?${next}`);
  };
  return (
    <div className="mx-auto max-w-[1440px] space-y-7 p-5 sm:p-8 xl:p-10">
      {previewCustomer && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Client preview · You are viewing the client-safe response as a
          superadmin.
        </div>
      )}
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
                  overview: "Your freight. A clearer view.",
                  enquiries: "Your enquiries",
                  quotes: "Quotations & approvals",
                  bookings: "Confirmed plans",
                  shipments: "Your shipments",
                  tracking: "Follow every movement",
                  documents: "Documents & readiness",
                  tasks: "Your next actions",
                  finance: "Invoices & balances",
                  reports: "Your invoices",
                  portal: "Your freight. A clearer view.",
                }[section] ?? "Your workspace")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            {s
              ? `${s.origin} → ${s.destination}`
              : "Clarity on cost. Confidence in every handover. Only your company’s work, with the access you need."}
          </p>
        </div>
        {!previewCustomer && ["overview", "enquiries"].includes(section) && (
          <Button onClick={() => setCreate((v) => !v)}>
            <Plus className="size-4" />
            New enquiry
          </Button>
        )}
      </div>
      {create && (
        <Panel title="Tell us what needs to move">
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
                toast.success("Enquiry submitted to the platform team");
                setCreate(false);
                router.push("/shipping/enquiries");
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
              ["origin", "Origin", "text", ""],
              ["destination", "Destination", "text", ""],
              ["cargo", "Cargo", "text", ""],
              ["weight", "Gross weight (kg)", "number", "1200"],
              ["volume", "Volume (m³)", "number", "8"],
              ["packages", "Packages", "number", "8"],
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
            ].map(([name, label, type, value]) => (
              <label className="field-label" key={name}>
                {label}
                <input
                  className={inputClass}
                  name={name}
                  type={type}
                  defaultValue={value}
                  required
                  min={type === "number" ? "0" : undefined}
                  step={name === "packages" ? "1" : "any"}
                />
              </label>
            ))}
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
            <div className="flex items-end gap-2">
              <Button disabled={busy}>
                {busy ? "Submitting…" : "Submit enquiry"}
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
              [
                "Active shipments",
                data.shipments.filter((s) => s.status !== "Delivered").length,
                "shipments",
              ],
              [
                "Quotes awaiting review",
                data.quotes.filter((q) => q.stage === "Quote Sent").length,
                "quotes",
              ],
              [
                "Open actions",
                data.tasks.filter((t) => !t.done).length,
                "tasks",
              ],
            ].map(([label, value, path]) => (
              <Link
                href={`/shipping/${path}`}
                key={label}
                className="metric-card"
              >
                <span className="text-xs text-slate-600">{label}</span>
                <div className="mt-5 flex items-end justify-between">
                  <strong className="text-4xl font-medium tracking-tight">
                    {value}
                  </strong>
                  <ArrowUpRight className="size-4 text-teal-700" />
                </div>
              </Link>
            ))}
          </div>
          <div className="value-banner">
            <div>
              <p className="eyebrow !text-teal-200">
                Make your next move a better one
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight">
                A lower cost starts with a clearer choice.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Compare routes and service levels, understand every fee, and
                request a quote with the assumptions already attached.
              </p>
            </div>
            <Link
              className="mt-6 inline-flex items-center gap-3 text-sm font-medium text-teal-100"
              href="/shipping/savings"
            >
              Explore your savings opportunities{" "}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <Panel title="Movements in focus">
            {data.shipments.length ? (
              <div className="divide-y">
                {data.shipments.slice(0, 5).map((s) => (
                  <Link
                    href={`/shipping/shipments?id=${s._id}`}
                    key={s._id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{s.reference}</p>
                      <p className="mt-2 text-xs text-slate-600">
                        {s.origin} → {s.destination}
                      </p>
                    </div>
                    <Badge>{s.status}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty>Your admin can assign shipments to your account.</Empty>
            )}
          </Panel>
        </>
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
            { label: "Enquiry", render: (e) => <strong>{e.reference}</strong> },
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
          {data.quotes
            .filter(
              (q) =>
                (!id || q._id === id) &&
                matches(q.reference, q.origin, q.destination),
            )
            .map((q) => (
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
                        {money(
                          Math.round(c.quantity * c.unitMinor),
                          q.currency,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {data.role === "user" ? (
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
                      await accept({ id: q._id });
                      router.push("/shipping/bookings");
                    }}
                  >
                    {q.stage === "Won"
                      ? "Open accepted booking"
                      : "Accept quote & book"}
                  </Action>
                )}
              </Panel>
            ))}
          {!data.quotes.length && (
            <Empty>
              No quotations are available for your assigned work yet.
            </Empty>
          )}
        </div>
      )}
      {section === "bookings" && (
        <Table
          page={page}
          onPage={setPage}
          rows={data.bookings.filter((b) =>
            matches(b.reference, b.origin, b.destination),
          )}
          columns={[
            { label: "Booking", render: (b) => <strong>{b.reference}</strong> },
            {
              label: "Route",
              render: (b) => (
                <>
                  {b.origin} → {b.destination}
                </>
              ),
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
            rows={data.shipments.filter((s) =>
              matches(s.reference, s.origin, s.destination),
            )}
            columns={[
              {
                label: "Shipment",
                render: (s) => (
                  <Link
                    className="font-semibold text-teal-800"
                    href={`?id=${s._id}`}
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
              onChange={(v) => router.replace(`?id=${v}`)}
              options={data.shipments.map((s) => ({
                value: s._id,
                label: s.reference,
              }))}
            />
          )}
          <RouteVisual {...s} />
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
                        className="text-xs font-medium text-teal-800 underline"
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
        <Empty>No shipments assigned to this account.</Empty>
      )}
      {section === "tasks" && (
        <>
          <label className="field-label max-w-xl">
            Completion note
            <input
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was completed?"
            />
          </label>
          <Table
            page={page}
            onPage={setPage}
            rows={data.tasks.filter((t) => matches(t.title, t.assignee))}
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
                  ) : (
                    <Action
                      disabled={!note.trim() || !!previewCustomer}
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
          rows={data.invoices.filter((i) => matches(i.reference))}
          columns={[
            { label: "Invoice", render: (i) => <strong>{i.reference}</strong> },
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
        Freight Operations · Fictional demonstration · Client visibility is
        enforced by the backend · No real bookings or payments
      </p>
    </div>
  );
}
