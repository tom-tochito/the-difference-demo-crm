"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  Plus,
  ArrowUpRight,
  Ship,
  Clock3,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  total,
  cost,
  STAGES,
  STATUSES,
  DOCUMENT_TYPES,
} from "../../../convex/shippingModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShippingContext,
  useShipping,
  useClock,
  Action,
  ActivityList,
  Badge,
  company,
  date,
  DocumentDownload,
  Empty,
  inputClass,
  Mode,
  money,
  Panel,
  readiness,
  RecordLink,
  Select,
  shipment,
  Table,
} from "./shared";
import { Editor, type EditRequest } from "./editor";
import { PrintPreview, type PrintRequest } from "./print-preview";
import {
  ChargeTable,
  CustomerDetail,
  InvoiceDetail,
  ShipmentDetail,
} from "./details";
import { RevenueChart, VolumeChart } from "./charts";
import { Portal } from "./portal";

const titles: Record<string, [string, string]> = {
  overview: [
    "Operations overview",
    "Every movement, every milestone. Your export desk at a glance.",
  ],
  customers: [
    "Customers & partners",
    "The relationships behind every shipment.",
  ],
  enquiries: [
    "Sales enquiries",
    "Turn the next conversation into a confirmed movement.",
  ],
  quotes: [
    "Freight quotations",
    "Clear pricing, connected opportunities and a visible pipeline.",
  ],
  bookings: [
    "Export bookings",
    "Accepted plans, ready for your operations team.",
  ],
  shipments: ["Shipment register", "One reliable view of every movement."],
  tracking: [
    "Shipment tracking",
    "Follow each journey from origin to final delivery.",
  ],
  documents: [
    "Export documents",
    "Review, approve and share the paperwork behind every movement.",
  ],
  tasks: [
    "Tasks & exceptions",
    "Keep handovers moving and bring attention to what matters.",
  ],
  finance: [
    "Finance",
    "Itemized charges, demo payments and clear outstanding balances.",
  ],
  reports: [
    "Operational reports",
    "A consistent view of the records your team works with.",
  ],
  settings: [
    "Demo settings",
    "Configure example document requirements and manage the freight dataset.",
  ],
};
export function ShippingApp({ section }: { section: string }) {
  const now = useClock();
  const data = useQuery(
    api.shipping.overview,
    section === "portal" ? "skip" : { now },
  );
  if (section === "portal") return <Portal />;
  if (!data)
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  return (
    <ShippingContext.Provider value={{ data, now }}>
      <Workspace section={section} />
    </ShippingContext.Provider>
  );
}
function Workspace({ section }: { section: string }) {
  const { data, now } = useShipping();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [editor, setEditor] = useState<EditRequest | null>(null);
  const [preview, setPreview] = useState<PrintRequest | null>(null);
  const [saved, setSaved] = useState<{ name: string; query: string }[]>(() => {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(
          section === "bookings"
            ? "freight.booking-views.v1"
            : "freight.views.v1",
        ) ?? "[]",
      );
      return Array.isArray(value)
        ? value.filter(
            (v): v is { name: string; query: string } =>
              typeof v?.name === "string" && typeof v?.query === "string",
          )
        : [];
    } catch {
      return [];
    }
  });
  const [saveName, setSaveName] = useState("");
  const id = params.get("id"),
    search = params.get("q") ?? "",
    status = params.get("status") ?? "all",
    mode = params.get("mode") ?? "all",
    view = params.get("view") ?? "all",
    sort = params.get("sort") ?? "reference",
    currency = params.get("currency") ?? "GBP";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const customerFilter = params.get("customer");
  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (!value || value === "all") p.delete(key);
    else p.set(key, value);
    if (key !== "page") p.delete("page");
    router.replace(`${pathname}?${p}`, { scroll: false });
  }
  const matches = (...values: unknown[]) =>
    values.join(" ").toLowerCase().includes(search.toLowerCase());
  const quoteEnquiry = useMutation(api.shipping.quoteEnquiry),
    accept = useMutation(api.shipping.acceptQuote),
    duplicate = useMutation(api.shipping.duplicateQuote),
    stage = useMutation(api.shipping.setQuoteStage),
    confirm = useMutation(api.shipping.confirmBooking),
    plan = useMutation(api.shipping.planShipment);
  const header = titles[section] ?? titles.overview;
  const actions: Record<string, EditRequest["kind"]> = {
    customers: "company",
    enquiries: "enquiry",
    quotes: "quote",
    bookings: "booking",
    shipments: "shipment",
    documents: "document",
    tasks: "task",
  };
  const detailShipment = data.shipments.find((s) => s._id === id);
  const detailCustomer = data.companies.find((c) => c._id === id);
  const active = data.shipments.filter((s) => s.status !== "Delivered");
  const pending = data.quotes.filter(
    (q) => q.stage !== "Won" && q.stage !== "Lost",
  );
  const upcoming = data.shipments.filter(
    (s) =>
      s.etd >= now && s.etd <= now + 7 * 86400000 && s.status !== "Delivered",
  );
  const arriving = data.shipments.filter(
    (s) =>
      s.eta >= now && s.eta <= now + 7 * 86400000 && s.status !== "Delivered",
  );
  let content;
  if (id && section === "shipments")
    content = detailShipment ? (
      <ShipmentDetail s={detailShipment} edit={setEditor} print={setPreview} />
    ) : (
      <Empty>
        Shipment not found.{" "}
        <Link href="/shipping/shipments">Return to register</Link>
      </Empty>
    );
  else if (id && section === "customers")
    content = detailCustomer ? (
      <CustomerDetail c={detailCustomer} edit={setEditor} print={setPreview} />
    ) : (
      <Empty>Customer not found.</Empty>
    );
  else if (id && section === "finance")
    content = <InvoiceDetail id={id} edit={setEditor} print={setPreview} />;
  else if (section === "overview")
    content = (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {[
            {
              label: "Active shipments",
              value: active.length,
              href: "/shipping/shipments?view=active",
              icon: Ship,
            },
            {
              label: "Pending quotes",
              value: pending.length,
              href: "/shipping/quotes?view=pending",
              icon: Clock3,
            },
            {
              label: "Departing this week",
              value: upcoming.length,
              href: "/shipping/shipments?view=departures",
              icon: ArrowUpRight,
            },
            {
              label: "Arriving this week",
              value: arriving.length,
              href: "/shipping/shipments?view=arrivals",
              icon: CheckCircle2,
            },
            {
              label: "Outstanding invoices",
              value: data.invoices.filter((i) => i.issued && i.balance > 0)
                .length,
              href: "/shipping/finance?view=outstanding",
              icon: AlertCircle,
            },
          ].map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border bg-white p-5 shadow-sm transition hover:border-indigo-300"
            >
              <div className="flex justify-between text-zinc-600">
                <stat.icon className="size-4" />
                <ArrowUpRight className="size-3 group-hover:text-indigo-600" />
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-zinc-600">{stat.label}</p>
            </Link>
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <Panel
            title="Attention needed"
            action={
              <Link
                className="text-xs font-medium text-indigo-600"
                href="/shipping/tasks"
              >
                View operations →
              </Link>
            }
          >
            <div className="divide-y">
              {data.exceptions
                .filter((e) => !e.resolved)
                .slice(0, 2)
                .map((e) => (
                  <div key={e._id} className="flex items-start gap-3 py-3">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-rose-400" />
                    <div>
                      <RecordLink section="shipments" id={e.shipmentId}>
                        {shipment(data, e.shipmentId)}
                      </RecordLink>
                      <p className="mt-1 text-xs text-zinc-600">{e.title}</p>
                    </div>
                  </div>
                ))}
              {data.shipments
                .filter((s) => readiness(data, s).missing.length)
                .slice(0, 2)
                .map((s) => (
                  <div key={s._id} className="flex items-start gap-3 py-3">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <RecordLink section="shipments" id={s._id}>
                        {s.reference}
                      </RecordLink>
                      <p className="mt-1 text-xs text-zinc-600">
                        {readiness(data, s).missing.join(", ")} need approval
                      </p>
                    </div>
                  </div>
                ))}
              {data.invoices
                .filter((i) => i.status === "Overdue")
                .slice(0, 1)
                .map((i) => (
                  <div key={i._id} className="flex items-start gap-3 py-3">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-rose-400" />
                    <div>
                      <RecordLink section="finance" id={i._id}>
                        {i.reference}
                      </RecordLink>
                      <p className="mt-1 text-xs text-zinc-600">
                        Overdue balance {money(i.balance, i.currency)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
          <Panel title="Quick actions">
            <div className="grid grid-cols-2 gap-3">
              {["company", "quote", "booking", "shipment"].map((kind) => (
                <Button
                  key={kind}
                  variant="outline"
                  className="h-16 justify-start capitalize"
                  onClick={() =>
                    setEditor({ kind: kind as EditRequest["kind"] })
                  }
                >
                  <Plus className="size-4" />
                  {kind === "company" ? "Customer" : kind}
                </Button>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-zinc-600">
              A connected workflow from customer enquiry to final invoice. Every
              external action is an explicit simulation.
            </p>
          </Panel>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <VolumeChart />
          <RevenueChart currency={currency} />
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <Panel title="Shipment status">
            <div className="space-y-3">
              {STATUSES.map((status) => (
                <Link
                  key={status}
                  href={`/shipping/shipments?status=${encodeURIComponent(status)}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-600">{status}</span>
                  <strong>
                    {data.shipments.filter((s) => s.status === status).length}
                  </strong>
                </Link>
              ))}
            </div>
            <div className="mt-5 flex justify-between border-t pt-4 text-xs">
              {["sea", "air", "road"].map((mode) => (
                <Link key={mode} href={`/shipping/shipments?mode=${mode}`}>
                  <Mode mode={mode} />{" "}
                  <strong>
                    {data.shipments.filter((s) => s.mode === mode).length}
                  </strong>
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Operational deadlines">
            {data.tasks
              .filter((t) => !t.done)
              .sort((a, b) => a.dueAt - b.dueAt)
              .slice(0, 5)
              .map((t) => (
                <div
                  key={t._id}
                  className="border-b py-3 first:pt-0 last:border-0"
                >
                  <p className="text-sm">{t.title}</p>
                  <p
                    className={`mt-1 text-xs ${t.dueAt < now ? "text-rose-600" : "text-zinc-600"}`}
                  >
                    {date(t.dueAt)} · {t.assignee}
                  </p>
                </div>
              ))}
          </Panel>
          <Panel title="Recent activity">
            <ActivityList items={data.activities.slice(0, 5)} />
          </Panel>
        </div>
      </div>
    );
  else if (section === "customers")
    content = (
      <Table
        page={page}
        onPage={(p) => setParam("page", String(p))}
        rows={data.companies.filter((c) =>
          matches(c.name, c.country, c.role, c.owner),
        )}
        columns={[
          {
            label: "Company",
            render: (c) => (
              <RecordLink section="customers" id={c._id}>
                {c.name}
              </RecordLink>
            ),
          },
          { label: "Role", render: (c) => <Badge>{c.role}</Badge> },
          { label: "Country", render: (c) => c.country },
          { label: "Account owner", render: (c) => c.owner },
          { label: "Mode", render: (c) => <Mode mode={c.preferredMode} /> },
          { label: "Terms", render: (c) => `${c.paymentDays} days` },
        ]}
      />
    );
  else if (section === "enquiries") {
    const rows = data.enquiries.filter(
      (e) =>
        (!id || e._id === id) &&
        matches(
          e.reference,
          company(data, e.customerId),
          e.origin,
          e.destination,
        ),
    );
    content = (
      <Table
        page={page}
        onPage={(p) => setParam("page", String(p))}
        rows={rows}
        columns={[
          {
            label: "Enquiry",
            render: (e) => (
              <div>
                <p className="font-medium">{e.reference}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  {company(data, e.customerId)}
                </p>
              </div>
            ),
          },
          {
            label: "Trade lane",
            render: (e) => (
              <div>
                {e.origin} → {e.destination}
                <p className="mt-1 text-xs text-zinc-600">{e.cargo}</p>
              </div>
            ),
          },
          { label: "Mode", render: (e) => <Mode mode={e.mode} /> },
          { label: "Stage", render: (e) => <Badge>{e.stage}</Badge> },
          {
            label: "Next step",
            render: (e) => (
              <Action
                onClick={async () => {
                  const qid = await quoteEnquiry({ id: e._id });
                  router.push(`/shipping/quotes?id=${qid}`);
                }}
              >
                Open / prepare quote
              </Action>
            ),
          },
        ]}
      />
    );
  } else if (section === "quotes") {
    const rows = data.quotes.filter(
      (q) =>
        (!id || q._id === id) &&
        (status === "all" || q.stage === status) &&
        (view !== "pending" || !["Won", "Lost"].includes(q.stage)) &&
        matches(
          q.reference,
          company(data, q.customerId),
          q.origin,
          q.destination,
        ),
    );
    const buttons = (q: (typeof rows)[number]) => (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPreview({ type: "Freight quotation", record: q })}
        >
          Preview
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={q.stage === "Won"}
          onClick={() => setEditor({ kind: "quote", record: q })}
        >
          Edit
        </Button>
        <Action onClick={() => duplicate({ id: q._id })}>Duplicate</Action>
        {q.stage !== "Won" && (
          <Action onClick={() => stage({ id: q._id, stage: "Quote Sent" })}>
            Simulate send
          </Action>
        )}
        <Action
          onClick={async () => {
            const bid = await accept({ id: q._id });
            router.push(`/shipping/bookings?id=${bid}`);
          }}
        >
          {q.stage === "Won" ? "Open booking" : "Accept & book"}
        </Action>
      </div>
    );
    content = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Stage"
            value={status}
            onChange={(v) => setParam("status", v)}
            options={[{ value: "all", label: "All stages" }, ...STAGES]}
          />
          <Select
            label="Layout"
            value={params.get("layout") ?? "list"}
            onChange={(v) => setParam("layout", v)}
            options={["list", "board"]}
          />
        </div>
        {id && rows[0] && (
          <Panel
            title={`${rows[0].reference} · ${company(data, rows[0].customerId)}`}
          >
            <p className="mb-4 text-sm text-zinc-600">
              {rows[0].cargo} · {rows[0].weightKg} kg · Valid to{" "}
              {date(rows[0].validity)}
            </p>
            <ChargeTable
              charges={rows[0].charges}
              currency={rows[0].currency}
            />
          </Panel>
        )}
        {params.get("layout") === "board" ? (
          <div className="grid gap-3 overflow-x-auto md:grid-cols-3 xl:grid-cols-6">
            {STAGES.map((s) => (
              <div key={s} className="min-w-0 rounded-xl bg-zinc-200/50 p-3">
                <h3 className="mb-4 text-xs font-semibold">
                  {s}{" "}
                  <span className="text-zinc-600">
                    {rows.filter((q) => q.stage === s).length}
                  </span>
                </h3>
                <div className="space-y-3">
                  {rows
                    .filter((q) => q.stage === s)
                    .map((q) => (
                      <Link
                        href={`/shipping/quotes?id=${q._id}`}
                        key={q._id}
                        className="block rounded-lg border bg-white p-3 shadow-sm"
                      >
                        <p className="text-xs font-semibold text-indigo-700">
                          {q.reference}
                        </p>
                        <p className="mt-2 text-sm">
                          {company(data, q.customerId)}
                        </p>
                        <p className="mt-3 text-xs text-zinc-600">
                          {q.origin} → {q.destination}
                        </p>
                        <p className="mt-3 text-sm font-semibold">
                          {money(total(q.charges), q.currency)}
                        </p>
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table
            page={page}
            onPage={(p) => setParam("page", String(p))}
            rows={rows}
            columns={[
              {
                label: "Quote / customer",
                render: (q) => (
                  <div>
                    <RecordLink section="quotes" id={q._id}>
                      {q.reference}
                    </RecordLink>
                    <p className="mt-1 text-xs text-zinc-600">
                      {company(data, q.customerId)}
                    </p>
                  </div>
                ),
              },
              {
                label: "Route",
                render: (q) => (
                  <div>
                    <p>
                      {q.origin} → {q.destination}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      <Mode mode={q.mode} /> · {q.incoterm}
                    </p>
                  </div>
                ),
              },
              {
                label: "Stage",
                render: (q) =>
                  q.stage === "Won" ? (
                    <Badge>Won</Badge>
                  ) : (
                    <select
                      aria-label={`Stage for ${q.reference}`}
                      className={inputClass}
                      value={q.stage}
                      onChange={async (e) => {
                        try {
                          await stage({ id: q._id, stage: e.target.value });
                          toast.success("Stage updated");
                        } catch (error) {
                          toast.error(String(error));
                        }
                      }}
                    >
                      {STAGES.filter((s) => s !== "Won").map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  ),
              },
              {
                label: "Total",
                render: (q) => (
                  <div className="whitespace-nowrap font-medium">
                    {money(total(q.charges), q.currency)}
                    <p className="mt-1 text-xs font-normal text-zinc-600">
                      Valid {date(q.validity)}
                    </p>
                  </div>
                ),
              },
              { label: "Actions", render: buttons },
            ]}
          />
        )}
      </div>
    );
  } else if (section === "bookings")
    content = (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select
            label="Mode"
            value={mode}
            onChange={(v) => setParam("mode", v)}
            options={[
              { value: "all", label: "All modes" },
              "sea",
              "air",
              "road",
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={(v) => setParam("status", v)}
            options={["all", "confirmed", "pending"]}
          />
          <Select
            label="Sort"
            value={sort}
            onChange={(v) => setParam("sort", v)}
            options={["reference", "etd", "eta"]}
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs text-zinc-600">
            Save view
            <input
              className={`${inputClass} mt-1 max-w-36`}
              placeholder="View name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
          </label>
          <Button
            variant="outline"
            disabled={!saveName.trim()}
            onClick={() => {
              const next = [
                ...saved.filter((s) => s.name !== saveName),
                { name: saveName.trim(), query: params.toString() },
              ].slice(-10);
              try {
                localStorage.setItem(
                  "freight.booking-views.v1",
                  JSON.stringify(next),
                );
                setSaved(next);
                setSaveName("");
                toast.success("View saved on this device");
              } catch {
                toast.error("Browser storage is unavailable");
              }
            }}
          >
            Save
          </Button>
        </div>
        {saved.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <Button
                size="sm"
                variant="outline"
                key={s.name}
                onClick={() => router.push(`/shipping/bookings?${s.query}`)}
              >
                {s.name}
              </Button>
            ))}
          </div>
        )}
        <Table
          page={page}
          onPage={(p) => setParam("page", String(p))}
          rows={data.bookings
            .filter(
              (b) =>
                (!id || b._id === id) &&
                (mode === "all" || b.mode === mode) &&
                (status === "all" ||
                  (status === "confirmed" ? b.confirmed : !b.confirmed)) &&
                matches(
                  b.reference,
                  company(data, b.customerId),
                  b.origin,
                  b.destination,
                ),
            )
            .sort((a, b) =>
              sort === "eta"
                ? a.eta - b.eta
                : sort === "etd"
                  ? a.etd - b.etd
                  : a.reference.localeCompare(b.reference),
            )}
          columns={[
            {
              label: "Booking",
              render: (b) => (
                <div className="font-medium">
                  {b.reference}
                  <p className="mt-1 text-xs font-normal text-zinc-600">
                    {company(data, b.customerId)}
                  </p>
                </div>
              ),
            },
            {
              label: "Route",
              render: (b) => (
                <div>
                  {b.origin} → {b.destination}
                  <p className="mt-1 text-xs text-zinc-600">
                    <Mode mode={b.mode} />
                  </p>
                </div>
              ),
            },
            {
              label: "Agreed total",
              render: (b) => money(total(b.charges), b.currency),
            },
            {
              label: "Status",
              render: (b) => (
                <Badge>
                  {b.confirmed ? "Confirmed (demo)" : "Awaiting confirmation"}
                </Badge>
              ),
            },
            {
              label: "Next step",
              render: (b) => (
                <div className="flex flex-wrap gap-2">
                  {!data.shipments.some((s) => s.bookingId === b._id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditor({ kind: "booking", record: b })}
                    >
                      Edit booking
                    </Button>
                  )}
                  {b.quoteId && (
                    <RecordLink section="quotes" id={b.quoteId}>
                      Source quote
                    </RecordLink>
                  )}
                  {!b.confirmed && (
                    <Action onClick={() => confirm({ id: b._id })}>
                      Simulate confirmation
                    </Action>
                  )}
                  <Action
                    disabled={!b.confirmed}
                    onClick={async () => {
                      const sid = await plan({ id: b._id });
                      router.push(`/shipping/shipments?id=${sid}`);
                    }}
                  >
                    Plan / open shipment
                  </Action>
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  else if (section === "shipments") {
    const rows = data.shipments
      .filter(
        (s) =>
          (status === "all" || s.status === status) &&
          (mode === "all" || s.mode === mode) &&
          (!customerFilter || s.customerId === customerFilter) &&
          matches(
            s.reference,
            company(data, s.customerId),
            s.origin,
            s.destination,
            s.operator,
          ) &&
          (view !== "active" || s.status !== "Delivered") &&
          (view !== "departures" || upcoming.some((u) => u._id === s._id)) &&
          (view !== "arrivals" || arriving.some((u) => u._id === s._id)) &&
          (view !== "exceptions" ||
            data.exceptions.some(
              (e) => e.shipmentId === s._id && !e.resolved,
            )) &&
          (view !== "documents" || readiness(data, s).missing.length > 0),
      )
      .sort((a, b) =>
        sort === "eta"
          ? a.eta - b.eta
          : sort === "etd"
            ? a.etd - b.etd
            : a.reference.localeCompare(b.reference),
      );
    content = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Mode"
            value={mode}
            onChange={(v) => setParam("mode", v)}
            options={[
              { value: "all", label: "All modes" },
              "sea",
              "air",
              "road",
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={(v) => setParam("status", v)}
            options={[{ value: "all", label: "All statuses" }, ...STATUSES]}
          />
          <Select
            label="View"
            value={view}
            onChange={(v) => setParam("view", v)}
            options={[
              "all",
              "active",
              "departures",
              "arrivals",
              "exceptions",
              "documents",
            ]}
          />
          <Select
            label="Sort"
            value={sort}
            onChange={(v) => setParam("sort", v)}
            options={["reference", "etd", "eta"]}
          />
          <div className="flex items-end gap-2">
            <label className="text-xs text-zinc-600">
              Save view
              <input
                className={`${inputClass} mt-1 max-w-36`}
                placeholder="View name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </label>
            <Button
              variant="outline"
              disabled={!saveName.trim()}
              onClick={() => {
                const next = [
                  ...saved.filter((s) => s.name !== saveName),
                  { name: saveName.trim(), query: params.toString() },
                ].slice(-10);
                try {
                  localStorage.setItem(
                    "freight.views.v1",
                    JSON.stringify(next),
                  );
                  setSaved(next);
                  setSaveName("");
                  toast.success("View saved on this device");
                } catch {
                  toast.error("Browser storage is unavailable");
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
        {saved.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <Button
                size="sm"
                variant="outline"
                key={s.name}
                onClick={() => router.push(`/shipping/shipments?${s.query}`)}
              >
                {s.name}
              </Button>
            ))}
          </div>
        )}
        <Table
          page={page}
          onPage={(p) => setParam("page", String(p))}
          rows={rows}
          columns={[
            {
              label: "Shipment / customer",
              render: (s) => (
                <div>
                  <RecordLink section="shipments" id={s._id}>
                    {s.reference}
                  </RecordLink>
                  <p className="mt-1 text-xs text-zinc-600">
                    {company(data, s.customerId)}
                  </p>
                </div>
              ),
            },
            {
              label: "Route / mode",
              render: (s) => (
                <div className="min-w-40">
                  <p>
                    {s.origin} → {s.destination}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    <Mode mode={s.mode} />
                  </p>
                </div>
              ),
            },
            {
              label: "Carrier / service",
              render: (s) => (
                <div className="text-xs">
                  {s.carrier}
                  <p className="mt-1 text-zinc-600">{s.service}</p>
                </div>
              ),
            },
            {
              label: "ETD / ETA",
              render: (s) => (
                <div className="whitespace-nowrap text-xs">
                  {date(s.etd)}
                  <p className="mt-1 text-zinc-600">{date(s.eta)}</p>
                </div>
              ),
            },
            { label: "Status", render: (s) => <Badge>{s.status}</Badge> },
            {
              label: "Operator",
              render: (s) => <span className="text-xs">{s.operator}</span>,
            },
            {
              label: "Readiness",
              render: (s) => (
                <div>
                  <Badge>{`${readiness(data, s).ready}/${readiness(data, s).total} docs`}</Badge>
                  {data.exceptions.some(
                    (e) => e.shipmentId === s._id && !e.resolved,
                  ) && <p className="mt-1 text-xs text-rose-600">Exception</p>}
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  } else if (section === "tracking") {
    const selected =
      data.shipments.find((s) => s._id === params.get("shipment")) ??
      data.shipments[0];
    content = selected ? (
      <div className="space-y-5">
        <Select
          label="Shipment"
          value={selected._id}
          onChange={(v) => setParam("shipment", v)}
          options={data.shipments.map((s) => ({
            value: s._id,
            label: `${s.reference} · ${s.origin} → ${s.destination}`,
          }))}
        />
        <ShipmentDetail
          key={selected._id}
          s={selected}
          edit={setEditor}
          print={setPreview}
        />
      </div>
    ) : (
      <Empty />
    );
  } else if (section === "documents")
    content = (
      <div className="space-y-4">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Sample documents are marked DEMO — NOT VALID FOR SHIPPING. Checklist
          requirements are configurable examples.
        </p>
        <Select
          label="Document status"
          value={status}
          onChange={(v) => setParam("status", v)}
          options={[
            { value: "all", label: "All statuses" },
            "Missing",
            "Draft",
            "Awaiting approval",
            "Approved",
          ]}
        />
        <Table
          page={page}
          onPage={(p) => setParam("page", String(p))}
          rows={data.documents.filter(
            (d) =>
              (status === "all" || d.status === status) &&
              (!customerFilter ||
                data.shipments.some(
                  (s) =>
                    s._id === d.shipmentId && s.customerId === customerFilter,
                )) &&
              matches(d.type, shipment(data, d.shipmentId), d.owner),
          )}
          columns={[
            {
              label: "Document",
              render: (d) => (
                <div className="font-medium">
                  {d.type}
                  <p className="mt-1 text-xs font-normal text-zinc-600">
                    {d.shared ? "Customer shared" : "Internal"}
                  </p>
                </div>
              ),
            },
            {
              label: "Shipment",
              render: (d) => (
                <RecordLink section="shipments" id={d.shipmentId}>
                  {shipment(data, d.shipmentId)}
                </RecordLink>
              ),
            },
            { label: "Status", render: (d) => <Badge>{d.status}</Badge> },
            {
              label: "Owner / updated",
              render: (d) => (
                <div className="text-xs">
                  {d.owner}
                  <p className="mt-1 text-zinc-600">{date(d.updatedAt)}</p>
                </div>
              ),
            },
            {
              label: "Actions",
              render: (d) => (
                <div className="flex gap-2">
                  {d.storageId ? (
                    <DocumentDownload id={d._id} />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const s = data.shipments.find(
                          (s) => s._id === d.shipmentId,
                        );
                        if (s) setPreview({ type: d.type, record: s });
                      }}
                    >
                      Preview / PDF
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditor({
                        kind: "document",
                        record: d,
                        shipmentId: d.shipmentId,
                      })
                    }
                  >
                    Manage / attach
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  else if (section === "tasks")
    content = (
      <div className="space-y-5">
        <Select
          label="Task view"
          value={view}
          onChange={(v) => setParam("view", v)}
          options={["all", "overdue", "upcoming", "completed"]}
        />
        <Table
          page={page}
          onPage={(p) => setParam("page", String(p))}
          rows={data.tasks
            .filter(
              (t) =>
                (!customerFilter || t.customerId === customerFilter) &&
                matches(
                  t.title,
                  t.assignee,
                  t.shipmentId && shipment(data, t.shipmentId),
                ) &&
                (view !== "overdue" || (!t.done && t.dueAt < now)) &&
                (view !== "upcoming" || (!t.done && t.dueAt >= now)) &&
                (view !== "completed" || t.done),
            )
            .sort((a, b) => a.dueAt - b.dueAt)}
          columns={[
            {
              label: "Task",
              render: (t) => (
                <div className="font-medium">
                  {t.title}
                  <p className="mt-1 text-xs font-normal text-zinc-600">
                    {t.resolution}
                  </p>
                </div>
              ),
            },
            {
              label: "Related shipment",
              render: (t) =>
                t.shipmentId ? (
                  <RecordLink section="shipments" id={t.shipmentId}>
                    {shipment(data, t.shipmentId)}
                  </RecordLink>
                ) : t.customerId ? (
                  <RecordLink section="customers" id={t.customerId}>
                    {company(data, t.customerId)}
                  </RecordLink>
                ) : (
                  "—"
                ),
            },
            { label: "Assignee", render: (t) => t.assignee },
            { label: "Priority", render: (t) => <Badge>{t.priority}</Badge> },
            {
              label: "Due",
              render: (t) => (
                <span
                  className={!t.done && t.dueAt < now ? "text-rose-600" : ""}
                >
                  {date(t.dueAt)}
                </span>
              ),
            },
            {
              label: "Status",
              render: (t) =>
                t.done ? (
                  <Badge>Complete</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditor({ kind: "resolveTask", record: t })
                    }
                  >
                    Complete
                  </Button>
                ),
            },
          ]}
        />
        <Panel title="Operational exceptions">
          <div className="space-y-3">
            {data.exceptions
              .filter(
                (e) =>
                  !customerFilter ||
                  data.shipments.some(
                    (s) =>
                      s._id === e.shipmentId && s.customerId === customerFilter,
                  ),
              )
              .map((e) => (
                <div
                  key={e._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <RecordLink section="shipments" id={e.shipmentId}>
                      {shipment(data, e.shipmentId)}
                    </RecordLink>
                    {e.resolved && (
                      <p className="mt-1 text-sm text-zinc-600">
                        {e.resolution}
                      </p>
                    )}
                  </div>
                  {e.resolved ? (
                    <Badge>Complete</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditor({ kind: "resolveException", record: e })
                      }
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
          </div>
        </Panel>
      </div>
    );
  else if (section === "finance")
    content = (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {["GBP", "EUR", "USD"].map((c) => {
            const invoices = data.invoices.filter(
              (i) => i.currency === c && i.issued,
            );
            return (
              <Panel key={c} title={c}>
                <p className="text-xs text-zinc-600">Outstanding balance</p>
                <p className="mt-2 text-2xl font-semibold">
                  {money(
                    invoices.reduce((s, i) => s + i.balance, 0),
                    c,
                  )}
                </p>
                <p className="mt-3 text-xs text-zinc-600">
                  Invoiced{" "}
                  {money(
                    invoices.reduce((s, i) => s + i.total, 0),
                    c,
                  )}
                </p>
              </Panel>
            );
          })}
        </div>
        <div className="flex gap-3">
          <Select
            label="Status"
            value={status}
            onChange={(v) => setParam("status", v)}
            options={[
              { value: "all", label: "All invoices" },
              "Draft",
              "Issued",
              "Partially paid",
              "Paid",
              "Overdue",
            ]}
          />
          <Select
            label="View"
            value={view}
            onChange={(v) => setParam("view", v)}
            options={["all", "outstanding"]}
          />
        </div>
        <Table
          page={page}
          onPage={(p) => setParam("page", String(p))}
          rows={data.invoices.filter(
            (i) =>
              (status === "all" || i.status === status) &&
              (view !== "outstanding" || (i.issued && i.balance > 0)) &&
              matches(
                i.reference,
                company(data, i.customerId),
                shipment(data, i.shipmentId),
              ),
          )}
          columns={[
            {
              label: "Invoice / customer",
              render: (i) => (
                <div>
                  <RecordLink section="finance" id={i._id}>
                    {i.reference}
                  </RecordLink>
                  <p className="mt-1 text-xs text-zinc-600">
                    {company(data, i.customerId)}
                  </p>
                </div>
              ),
            },
            {
              label: "Shipment",
              render: (i) => (
                <RecordLink section="shipments" id={i.shipmentId}>
                  {shipment(data, i.shipmentId)}
                </RecordLink>
              ),
            },
            { label: "Status", render: (i) => <Badge>{i.status}</Badge> },
            { label: "Due", render: (i) => date(i.dueAt) },
            { label: "Total", render: (i) => money(i.total, i.currency) },
            {
              label: "Balance",
              render: (i) => <strong>{money(i.balance, i.currency)}</strong>,
            },
          ]}
        />
      </div>
    );
  else if (section === "reports")
    content = (
      <Reports
        currency={currency}
        setCurrency={(v) => setParam("currency", v)}
      />
    );
  else if (section === "settings") content = <Settings />;
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-7 lg:p-8">
      {!(id && ["shipments", "customers", "finance"].includes(section)) && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-zinc-600">
                <span className="size-1.5 rounded-full bg-emerald-500" />{" "}
                Freight Operations <span className="text-zinc-300">/</span>{" "}
                Workspace
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {header[0]}
              </h1>
              <p className="mt-2 text-sm text-zinc-600">{header[1]}</p>
            </div>
            {actions[section] && (
              <Button onClick={() => setEditor({ kind: actions[section] })}>
                <Plus className="size-4" />
                New{" "}
                {actions[section] === "company" ? "customer" : actions[section]}
              </Button>
            )}
          </div>
          {[
            "customers",
            "enquiries",
            "quotes",
            "bookings",
            "shipments",
            "documents",
            "tasks",
            "finance",
          ].includes(section) && (
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-3 size-4 text-zinc-600" />
              <input
                aria-label={`Search ${section}`}
                placeholder={`Search ${section}…`}
                className={`${inputClass} pl-10`}
                value={search}
                onChange={(e) => setParam("q", e.target.value)}
              />
            </div>
          )}
        </>
      )}
      {content}
      {editor && (
        <Editor
          key={`${editor.kind}-${String(editor.record?._id ?? "new")}`}
          request={editor}
          close={() => setEditor(null)}
        />
      )}{" "}
      {preview && (
        <PrintPreview request={preview} close={() => setPreview(null)} />
      )}
      <footer className="border-t pt-5 text-[11px] text-zinc-600">
        Freight Operations · Fictional demo data · Last initialized{" "}
        {date(data.settings.seededAt)} · No live freight rates or external
        transactions
      </footer>
    </div>
  );
}
function Reports({
  currency,
  setCurrency,
}: {
  currency: string;
  setCurrency: (v: string) => void;
}) {
  const { data } = useShipping();
  const won = data.quotes.filter((q) => q.stage === "Won").length;
  const lost = data.quotes.filter((q) => q.stage === "Lost").length;
  const delivered = data.shipments.filter(
    (s) => s.status === "Delivered" && s.milestones[5]?.actual,
  );
  const onTime = delivered.filter(
    (s) => s.milestones[5].actual! <= s.milestones[5].planned,
  ).length;
  const invoices = data.invoices.filter(
    (i) => i.currency === currency && i.issued,
  );
  return (
    <div className="space-y-5">
      <Select
        label="Report currency"
        value={currency}
        onChange={setCurrency}
        options={["GBP", "EUR", "USD"]}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          [
            "Quote conversion",
            won + lost ? `${Math.round((won / (won + lost)) * 100)}%` : "—",
          ],
          [
            "On-time delivery",
            delivered.length
              ? `${Math.round((onTime / delivered.length) * 100)}%`
              : "—",
          ],
          [
            "Invoiced revenue",
            money(
              invoices.reduce((s, i) => s + i.total, 0),
              currency,
            ),
          ],
          [
            "Outstanding balance",
            money(
              invoices.reduce((s, i) => s + i.balance, 0),
              currency,
            ),
          ],
        ].map(([k, v]) => (
          <Panel key={k}>
            <p className="text-xs text-zinc-600">{k}</p>
            <p className="mt-2 text-2xl font-semibold">{v}</p>
          </Panel>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <VolumeChart />
        <RevenueChart currency={currency} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Revenue by customer">
          <div className="space-y-4">
            {data.companies
              .map((c) => ({
                c,
                revenue: invoices
                  .filter((i) => i.customerId === c._id)
                  .reduce((s, i) => s + i.total, 0),
              }))
              .filter((r) => r.revenue)
              .sort((a, b) => b.revenue - a.revenue)
              .map(({ c, revenue }) => (
                <div key={c._id} className="flex justify-between gap-3 text-sm">
                  <RecordLink section="customers" id={c._id}>
                    {c.name}
                  </RecordLink>
                  <strong>{money(revenue, currency)}</strong>
                </div>
              ))}
          </div>
        </Panel>
        <Panel title="Shipment mix">
          <div className="space-y-3">
            {[
              ...new Set(
                data.shipments.map((s) => `${s.origin} → ${s.destination}`),
              ),
            ].map((lane) => (
              <div key={lane} className="flex justify-between gap-3 text-sm">
                <span className="text-zinc-600">{lane}</span>
                <strong>
                  {
                    data.shipments.filter(
                      (s) => `${s.origin} → ${s.destination}` === lane,
                    ).length
                  }
                </strong>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t pt-4">
            {STATUSES.map((status) => (
              <div key={status} className="flex justify-between py-1 text-sm">
                <span className="text-zinc-600">{status}</span>
                <strong>
                  {data.shipments.filter((s) => s.status === status).length}
                </strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title={`Estimated shipment economics · ${currency}`}>
        <div className="grid grid-cols-3 gap-3">
          {[
            [
              "Charge value",
              data.shipments
                .filter((s) => s.currency === currency)
                .reduce((n, s) => n + total(s.charges), 0),
            ],
            [
              "Estimated cost",
              data.shipments
                .filter((s) => s.currency === currency)
                .reduce((n, s) => n + cost(s.charges), 0),
            ],
            [
              "Estimated margin",
              data.shipments
                .filter((s) => s.currency === currency)
                .reduce((n, s) => n + total(s.charges) - cost(s.charges), 0),
            ],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-zinc-600">{k}</p>
              <p className="mt-2 font-semibold">{money(Number(v), currency)}</p>
            </div>
          ))}
        </div>
      </Panel>
      <p className="text-xs leading-6 text-zinc-600">
        Assumptions: conversion = Won ÷ (Won + Lost); open quotes are excluded.
        On-time delivery compares actual delivery with the original planned
        delivery milestone. Revenue excludes draft invoices and is grouped by
        issue month. Shipment volume uses departure month. Estimated costs and
        margins use recorded demo charge lines. Currency totals are separate; no
        exchange-rate conversion or tax calculation is applied.
      </p>
    </div>
  );
}
function Settings() {
  const { data } = useShipping();
  const user = useQuery(api.users.currentUser);
  const setRequirements = useMutation(api.shipping.setRequirements);
  const reset = useMutation(api.shippingSeed.reset);
  const [mode, setMode] = useState<"sea" | "air" | "road">("sea");
  const [chosen, setChosen] = useState<string[]>([
    ...data.settings.requirements.sea,
  ]);
  const [confirmation, setConfirmation] = useState("");
  if (user?.role !== "admin")
    return <Empty>Administrator access is required.</Empty>;
  return (
    <div className="space-y-5">
      <Panel title="Example document requirements">
        <p className="mb-4 text-sm text-zinc-600">
          These are demonstration checklists, not legal or customs compliance
          rules. Existing shipment readiness uses the current checklist
          immediately.
        </p>
        <Select
          label="Mode"
          value={mode}
          onChange={(v) => {
            setMode(v as typeof mode);
            setChosen([...data.settings.requirements[v as typeof mode]]);
          }}
          options={["sea", "air", "road"]}
        />
        <div className="my-5 grid gap-3 sm:grid-cols-2">
          {DOCUMENT_TYPES.map((type) => (
            <label key={type} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={chosen.includes(type)}
                onChange={(e) =>
                  setChosen(
                    e.target.checked
                      ? [...chosen, type]
                      : chosen.filter((t) => t !== type),
                  )
                }
              />
              {type}
            </label>
          ))}
        </div>
        <Action
          onClick={() =>
            setRequirements({
              mode,
              types: chosen as (typeof DOCUMENT_TYPES)[number][],
            })
          }
        >
          Save requirements
        </Action>
      </Panel>
      <Panel title="Reset freight demo">
        <p className="text-sm leading-6 text-zinc-600">
          Reset deletes freight records, edits and attachments, then restores
          the connected sample dataset with dates relative to today. Charity
          records and login accounts remain unchanged. This affects everyone
          using this demo backend.
        </p>
        <label className="mt-5 block max-w-sm space-y-2 text-sm">
          Type RESET SHIPPING to confirm
          <input
            className={inputClass}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        <div className="mt-4">
          <Action
            variant="destructive"
            disabled={confirmation !== "RESET SHIPPING"}
            onClick={async () => {
              await reset({ confirmation });
              setConfirmation("");
            }}
          >
            Reset shipping demo data
          </Action>
        </div>
      </Panel>
    </div>
  );
}
