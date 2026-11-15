"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowRight,
  Database,
  RefreshCw,
  ShieldCheck,
  Check,
  Layers,
  Activity,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  useClock,
  Action,
  Badge,
  Panel,
  Empty,
  money,
  date,
  Mode,
  Select,
  inputClass,
} from "./shared";
import { ClientWorkspace } from "./client-workspace";
export function PageHeading({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <h1 className="page-title">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}
export function SavingsStudio() {
  const now = useClock();
  const data = useQuery(api.savings.overview);
  const request = useMutation(api.savings.requestQuote);
  const router = useRouter();
  const [selected, setSelected] = useState("");
  if (!data) return <Loading />;
  const s = data.scenarios.find((s) => s.id === selected) ?? data.scenarios[0];
  if (!s)
    return (
      <div className="p-10">
        <Empty>No comparisons are configured for this client yet.</Empty>
      </div>
    );
  const best = Math.max(...s.options.map((o) => o.savingMinor));
  return (
    <div className="workspace-page">
      <PageHeading
        label="Savings studio"
        title="Better choices. Visible value."
        description="Explore the trade-offs behind your next shipment. Every comparison includes the platform fee, a clear baseline and the source assumptions."
      />
      <div className="grid gap-3 md:grid-cols-3">
        {data.scenarios.map((row, i) => (
          <button
            onClick={() => setSelected(row.id)}
            key={row.id}
            className={`rounded-xl border p-5 text-left transition-colors ${s.id === row.id ? "border-teal-600 bg-teal-50/60 ring-1 ring-teal-600" : "border-slate-200 bg-white hover:border-slate-400"}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-teal-800">
              Opportunity 0{i + 1} · {row.currency}
            </p>
            <p className="mt-3 text-sm font-semibold leading-6">{row.title}</p>
            <p className="mt-3 text-[11px] text-slate-600">
              {row.origin} → {row.destination}
            </p>
          </button>
        ))}
      </div>
      <div className="value-banner grid gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow !text-teal-200">
            Illustrative opportunity · {s.key}
          </p>
          <h2 className="mt-3 max-w-lg text-3xl font-medium leading-tight tracking-tight">
            {s.title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            {s.description}
          </p>
          <p className="mt-5 text-xs text-slate-400">{s.cargo}</p>
        </div>
        <div className="md:border-l md:border-white/15 md:pl-8">
          <p className="text-xs text-slate-300">
            Potential saving from best option
          </p>
          <p className="mt-4 text-5xl font-medium tracking-tight text-teal-100">
            {money(best, s.currency)}
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Against {money(s.baselineMinor, s.currency)} baseline
          </p>
          <p className="mt-2 text-[10px] text-slate-400">
            Estimated, not guaranteed · No FX conversion
          </p>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[250px_1fr]">
        <Panel title="Your baseline">
          <div className="space-y-4">
            {s.baseline.map((l) => (
              <div key={l.label} className="text-xs">
                <p className="text-slate-600">{l.label}</p>
                <p className="mt-1 text-base font-medium">
                  {money(l.amountMinor, s.currency)}
                </p>
              </div>
            ))}
            <div className="border-t pt-4 text-xs leading-6 text-slate-600">
              Comparable logistics costs only. Goods value, duties, taxes and
              insurance are excluded from both sides. Savings options are
              alternatives and must not be added together.
            </div>
          </div>
        </Panel>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {s.options.map((o, index) => (
            <div
              key={o.label}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <Mode mode={o.mode} />
                <span>{o.days} days</span>
              </div>
              <h3 className="mt-5 text-base font-semibold">{o.label}</h3>
              <p className="mt-4 text-3xl font-medium tracking-tight">
                {money(o.priceMinor, s.currency)}
              </p>
              <p
                className={`mt-2 text-xs font-medium ${o.savingMinor >= 0 ? "text-teal-700" : "text-amber-800"}`}
              >
                {o.savingMinor >= 0
                  ? `${o.percent}% lower · ${money(o.savingMinor, s.currency)} estimated saving`
                  : `${money(-o.savingMinor, s.currency)} above baseline`}
              </p>
              <div className="my-6 space-y-3 border-y py-4 text-xs text-slate-600">
                {[
                  ["Freight", o.freightMinor],
                  ["Handling & documents", o.handlingMinor],
                  ["Platform service fee", o.feeMinor],
                ].map(([label, n]) => (
                  <div
                    key={String(label)}
                    className="flex justify-between gap-3"
                  >
                    <span>{label}</span>
                    <span className="text-slate-800">
                      {money(Number(n), s.currency)}
                    </span>
                  </div>
                ))}
              </div>
              {data.role === "superadmin" && (
                <div className="mb-5 rounded-lg bg-slate-50 p-3 text-xs">
                  <p className="mb-2 text-[9px] uppercase tracking-widest text-slate-600">
                    Internal economics
                  </p>
                  <div className="flex justify-between">
                    <span>Supplier costs</span>
                    <span>{money(o.supplierMinor ?? 0, s.currency)}</span>
                  </div>
                  <div className="mt-2 flex justify-between font-semibold text-teal-800">
                    <span>Est. gross margin</span>
                    <span>{money(o.marginMinor ?? 0, s.currency)}</span>
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-slate-600">
                    Selling price less supplier costs. Platform fee already
                    included.
                  </p>
                </div>
              )}
              <div className="mt-auto">
                <Action
                  disabled={s.source.validUntil < now}
                  onClick={async () => {
                    const id = await request({
                      scenarioId: s.id,
                      optionIndex: index,
                      sourceRevision: s.source.revision,
                    });
                    router.push(`/shipping/enquiries?id=${id}`);
                  }}
                >
                  Request this option <ArrowUpRight className="size-3" />
                </Action>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Panel
        title="Where these numbers come from"
        action={
          <Badge>
            {s.source.validUntil < now ? "Expired" : "Sample data"}
          </Badge>
        }
      >
        <div className="flex flex-wrap justify-between gap-4 text-xs leading-6 text-slate-600">
          <p>
            {s.source.name} · Revision {s.source.revision}
            <br />
            Observed {date(s.source.observedAt)} · Valid until{" "}
            {date(s.source.validUntil)}
          </p>
          <p className="max-w-md">
            Synthetic rates illustrate how aggregation could improve decisions.
            A quotation request stores these assumptions; source refreshes never
            change accepted pricing.
          </p>
          <Link href="/shipping/sources" className="font-medium text-teal-800">
            Explore data sources →
          </Link>
        </div>
      </Panel>
      {data.comparisons.length > 0 && (
        <Panel title="Your saved quotation requests">
          <div className="divide-y">
            {data.comparisons
              .slice(-8)
              .reverse()
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/shipping/enquiries?id=${c.enquiryId}`}
                  className="flex flex-wrap justify-between gap-2 py-3 text-xs"
                >
                  <span>
                    Requested {date(c.createdAt)} · Source revision{" "}
                    {c.sourceRevision}
                  </span>
                  <span>
                    {money(c.priceMinor, c.currency)} ·{" "}
                    {money(c.savingMinor, c.currency)} estimated saving →
                  </span>
                </Link>
              ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
export function Sources() {
  const now = useClock();
  const rows = useQuery(api.savings.sources),
    user = useQuery(api.users.currentUser);
  const refresh = useMutation(api.savings.refresh);
  if (!rows) return <Loading />;
  return (
    <div className="workspace-page">
      <PageHeading
        label="Data intelligence"
        title="A connected view of a fragmented market."
        description="The opportunity: bring rates, schedules and operational signals into one decision. These interactive sources use fictional fixtures; no external provider is connected."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Collect", "Rates, schedules and events", Database],
          ["Normalise", "Comparable units and currencies", Layers],
          ["Act", "Better quotes and earlier intervention", Activity],
        ].map(([title, description, Icon]) => {
          const I = Icon as typeof Database;
          return (
            <div key={String(title)} className="metric-card">
              <I className="size-5 text-teal-700" />
              <h2 className="mt-5 text-lg font-medium">{title as string}</h2>
              <p className="mt-2 text-xs text-slate-600">
                {description as string}
              </p>
            </div>
          );
        })}
      </div>
      <div className="space-y-4">
        {rows.map((s) => (
          <Panel
            key={s._id}
            title={s.name}
            action={
              <Badge>
                {s.validUntil < now ? "Expired" : "Simulated source"}
              </Badge>
            }
          >
            <div className="grid gap-5 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <p className="text-xs font-medium text-slate-700">
                  {s.category} · {s.coverage}
                </p>
                <p className="mt-3 text-xs leading-6 text-slate-600">
                  {s.provenance}
                </p>
              </div>
              <div className="text-xs leading-6 text-slate-600">
                Observed {date(s.observedAt)}
                <br />
                Valid until {date(s.validUntil)} · Revision {s.revision}
                {s.events[0] && (
                  <p className="mt-2 text-teal-800">{s.events[0].message}</p>
                )}
              </div>
              {user?.role === "superadmin" ? (
                <Action
                  onClick={() =>
                    refresh({ id: s._id, expectedRevision: s.revision })
                  }
                >
                  <RefreshCw className="size-3" />
                  Simulate refresh
                </Action>
              ) : (
                <span className="text-[11px] text-slate-600">
                  Managed by the platform team
                </span>
              )}
            </div>
          </Panel>
        ))}
      </div>
      <Panel title="From sample feed to live capability">
        <p className="text-sm leading-7 text-slate-600">
          Real connections would require supplier agreements, API access,
          licensing, currency and surcharge normalisation, quality checks and
          monitoring. Data freshness and service constraints must stay visible.
          The demo refresh changes deterministic sample observations and
          reprices open comparisons; it does not contact carriers.
        </p>
        <Link
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-teal-800"
          href="/shipping/guide"
        >
          See the implementation roadmap <ArrowRight className="size-4" />
        </Link>
      </Panel>
    </div>
  );
}
export function Team() {
  const user = useQuery(api.users.currentUser);
  if (!user) return <Loading />;
  if (user.role === "user")
    return (
      <div className="p-10">
        <Empty>Your client admin manages team access.</Empty>
      </div>
    );
  return <TeamControls />;
}
function TeamControls() {
  const [customer, setCustomer] = useState("");
  const [selected, setSelected] = useState("");
  const data = useQuery(
    api.platform.team,
    customer ? { customerId: customer as Id<"shippingCompanies"> } : {},
  );
  const create = useAction(api.platform.createUser),
    disable = useMutation(api.platform.setDisabled),
    assign = useMutation(api.platform.assign);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  if (!data) return <Loading />;
  const active = data.users.find((u) => u.id === selected);
  return (
    <div className="workspace-page">
      <PageHeading
        label="Team & access"
        title="The right work. The right people."
        description="Client boundaries are enforced by the backend. Assign linked jobs to users and keep financial approval with client admins."
      />
      {data.role === "superadmin" && (
        <Select
          label="Client organisation"
          value={customer}
          onChange={(v) => {
            setCustomer(v);
            setSelected("");
          }}
          options={[
            { value: "", label: "All accounts" },
            ...data.companies.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel title="Demo accounts">
          <div className="divide-y">
            {data.users.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="mt-1 text-xs text-slate-600">{u.email}</p>
                  <p className="mt-2">
                    <Badge>{u.disabled ? "Disabled" : u.role}</Badge>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.selected && u.role === "user" && !u.disabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(u.id)}
                    >
                      Assign work
                    </Button>
                  )}
                  {u.role !== "superadmin" &&
                    (data.role === "superadmin" || u.role === "user") && (
                      <Action
                        onClick={() =>
                          disable({ id: u.id, disabled: !u.disabled })
                        }
                      >
                        {u.disabled ? "Enable" : "Disable"}
                      </Action>
                    )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Add a demo teammate">
          {data.selected ? (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const f = new FormData(e.currentTarget);
                try {
                  const c = await create({
                    name: String(f.get("name")),
                    email: String(f.get("email")),
                    customerId: data.selected!,
                    role: String(f.get("role") ?? "user") as "admin" | "user",
                  });
                  setCredentials(c);
                  toast.success("Demo account created. No email was sent.");
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Could not create account",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field-label">
                Name
                <input
                  className={inputClass}
                  name="name"
                  maxLength={100}
                  required
                />
              </label>
              <label className="field-label">
                Fictional email
                <input
                  className={inputClass}
                  type="email"
                  name="email"
                  placeholder="name@company.example"
                  required
                />
              </label>
              <label className="field-label">
                Role
                <select className={inputClass} name="role">
                  <option value="user">User · Assigned work</option>
                  {data.role === "superadmin" && (
                    <option value="admin">Admin · Company approval</option>
                  )}
                </select>
              </label>
              <Button disabled={busy}>
                {busy ? "Creating…" : "Create demo account"}
              </Button>
              <p className="text-xs leading-6 text-slate-600">
                Only .example addresses. Invitations are simulated. Share the
                demo credentials to sign in through the login form.
              </p>
            </form>
          ) : (
            <Empty>Select a client organisation first.</Empty>
          )}
          {credentials && (
            <div className="mt-4 rounded-lg bg-teal-50 p-3 text-xs leading-6 text-teal-900">
              Demo credentials
              <br />
              {credentials.email}
              <br />
              Password: {credentials.password}
            </div>
          )}
        </Panel>
      </div>
      {active && (
        <Panel title={`Assigned work · ${active.name}`}>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            Enquiry assignments carry through linked quotes, bookings and
            shipments. Removing a direct shipment assignment does not remove
            access inherited from an assigned enquiry.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {data.jobs.map((j) => {
              const assigned = data.assignments.some(
                (a) =>
                  a.userId === active.id &&
                  a.entityId === j.id &&
                  a.kind === j.kind,
              );
              return (
                <Action
                  key={j.id}
                  onClick={() =>
                    assign({
                      userId: active.id,
                      kind: j.kind,
                      entityId: j.id,
                      assigned: !assigned,
                    })
                  }
                >
                  {assigned && <Check className="size-3" />}
                  {j.reference} ·{" "}
                  {assigned ? "Remove direct assignment" : "Assign"}
                </Action>
              );
            })}
          </div>
        </Panel>
      )}
      <Panel title="Three roles. Clear boundaries.">
        <div className="grid gap-5 text-xs leading-6 text-slate-600 md:grid-cols-3">
          <p>
            <strong className="text-slate-900">Superadmin</strong>
            <br />
            Platform operations, rates, economics, client accounts and global
            demo settings.
          </p>
          <p>
            <strong className="text-slate-900">Admin</strong>
            <br />
            Own company records, team assignments and quotation approval.
          </p>
          <p>
            <strong className="text-slate-900">User</strong>
            <br />
            Assigned work, enquiry submission, documents and task completion.
          </p>
        </div>
      </Panel>
    </div>
  );
}
export function ClientPreview() {
  const data = useQuery(api.platform.team, {});
  const [customer, setCustomer] = useState("");
  const c = customer || data?.companies[0]?.id;
  if (!data || !c) return <Loading />;
  return (
    <>
      <div className="px-8 pt-8">
        <Select
          label="Preview client company"
          value={c}
          onChange={setCustomer}
          options={data.companies.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>
      <ClientWorkspace
        key={c}
        section="portal"
        previewCustomer={c as Id<"shippingCompanies">}
      />
    </>
  );
}
export function DemoGuide() {
  const steps = [
    [
      "01",
      "Start with the importer",
      "Sign in as Alder & Finch Admin. Open Savings studio → SAVE-CONSOLIDATE. Compare the £6,000 baseline with the consolidated option. The initial sample offers £1,800 estimated savings after the platform fee; refreshed samples can differ.",
    ],
    [
      "02",
      "Turn insight into a quote",
      "Request the option. Sign in as Platform Superadmin, find the new enquiry, prepare its quote and simulate sending it. Return as the client admin to accept it. A user can request and compare but cannot approve.",
    ],
    [
      "03",
      "Move the work forward",
      "As superadmin, simulate booking confirmation and plan the shipment. As client admin, assign the linked enquiry to a teammate. Sign in as that user to see only their assigned work.",
    ],
    [
      "04",
      "Coordinate documents and delivery",
      "Upload a sample PDF or text file as the assigned user. Approve it as superadmin, simulate a tracking milestone and return to the client view. The update and shared attachment persist after reload.",
    ],
    [
      "05",
      "Show value on both sides",
      "Issue a demo shipment invoice and record a partial payment as superadmin. Compare customer savings with supplier costs and platform gross margin. Clients see their invoice and approved selling price, never internal economics.",
    ],
    [
      "06",
      "Prove the boundary",
      "Sign in as Northstar Admin: Alder & Finch records are unavailable. Explore SAVE-SERVICE, then show Data Sources, a simulated refresh and the unchanged saved comparison snapshot.",
    ],
  ];
  return (
    <div className="workspace-page">
      <PageHeading
        label="Demonstration & roadmap"
        title="From a better decision to a better business."
        description="A ten-minute story for importers, operators and partners. Everything below separates what works today from what would be required to run a live service."
      />
      <div className="value-banner">
        <BookOpen className="size-6 text-teal-200" />
        <h2 className="mt-5 text-3xl font-medium tracking-tight">
          One workflow. Two measurable outcomes.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Importers gain visibility and control over logistics costs. The
          platform can earn transparent service fees and a sustainable gross
          margin by coordinating suppliers and removing avoidable work. This
          demo illustrates the model; it does not establish real savings or
          market rates.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {steps.map(([n, title, body]) => (
          <Panel key={n}>
            <p className="eyebrow">{n} / Guided walkthrough</p>
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
          </Panel>
        ))}
      </div>
      <Panel title="Benefits to demonstrate">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            [
              "For importers",
              "Comparable quotes, fee transparency, consolidation opportunities, earlier document preparation, fewer handover gaps and an accountable view of each shipment.",
            ],
            [
              "For operators",
              "Connected records, less repeated entry, tasks and exception follow-up, consistent document review and a shared operational history.",
            ],
            [
              "For the platform",
              "Visible supplier costs, service fees and estimated gross margin; repeatable client onboarding and a basis for measuring retention and cost to serve.",
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <ShieldCheck className="size-5 text-teal-700" />
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="A practical path to a live service">
        <ol className="space-y-6">
          {[
            [
              "1. Prove the economics",
              "Pilot a narrow set of trade lanes with willing importers and forwarders. Establish comparable baselines, exclusions and service targets; measure net savings and support effort.",
            ],
            [
              "2. Connect licensed data",
              "Agree supplier access and licensing. Ingest rates, surcharges, schedules and milestones with provenance, validation, expiry rules, deduplication and reconciliation.",
            ],
            [
              "3. Harden identity and operations",
              "Replace public demo credentials with private invitations, recovery and MFA/SSO. Add audit retention, tenant-scale pagination, monitored jobs, backups and tested recovery.",
            ],
            [
              "4. Fulfil and bill reliably",
              "Integrate carrier booking, document exchange, invoicing and payment providers. Define approvals, reconciliation, refunds, service ownership and escalation procedures.",
            ],
            [
              "5. Scale from evidence",
              "Track realised savings, on-time delivery, gross margin, customer retention and cost to serve. Expand lanes and automation only when data quality and service economics justify it.",
            ],
          ].map(([title, body]) => (
            <li key={title}>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
            </li>
          ))}
        </ol>
      </Panel>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-xs leading-7 text-amber-900">
        <strong>Working demo:</strong> real authentication, backend permissions,
        persistent records, uploads, workflow transitions and calculations.
        <br />
        <strong>Simulated:</strong> supplier data, tracking events, booking
        confirmations, invitation emails, invoice sending and payment receipts.
        No customs determination or guaranteed savings.
        <br />
        <strong>Public demo:</strong> all advertised accounts are intentionally
        accessible. Do not upload confidential documents.
      </div>
      <Button variant="outline" onClick={() => window.print()}>
        Print demo guide
      </Button>
    </div>
  );
}
export function Loading() {
  return (
    <div className="p-10 text-sm text-slate-600">Loading your workspace…</div>
  );
}
export function CommercialHero() {
  const data = useQuery(api.savings.overview);
  const s = data?.scenarios[0],
    o = s?.options[0];
  return (
    <div className="value-banner grid gap-7 xl:grid-cols-[1.25fr_1fr]">
      <div>
        <p className="eyebrow !text-teal-200">The next chapter of freight</p>
        <h2 className="mt-4 max-w-lg text-4xl font-medium leading-[1.12] tracking-[-.035em]">
          Create value at
          <br />
          <span className="text-teal-200">every movement.</span>
        </h2>
        <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">
          Connect supplier intelligence with operational execution. Help
          importers keep more value while building a profitable service.
        </p>
        <Link
          href="/shipping/savings"
          className="mt-6 inline-flex items-center gap-3 text-xs font-semibold text-teal-100"
        >
          Explore savings studio <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="flex flex-col justify-center rounded-xl border border-white/15 bg-white/[.035] p-6">
        <p className="text-[10px] uppercase tracking-[.2em] text-slate-400">
          One illustrative movement · {s?.currency ?? "GBP"}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-300">Importer saves</p>
            <p className="mt-3 text-3xl font-medium tracking-tight text-teal-100">
              {o && s ? money(o.savingMinor, s.currency) : "—"}
            </p>
          </div>
          <div className="border-l border-white/15 pl-5">
            <p className="text-xs text-slate-300">Platform margin</p>
            <p className="mt-3 text-3xl font-medium tracking-tight">
              {o && s ? money(o.marginMinor ?? 0, s.currency) : "—"}
            </p>
          </div>
        </div>
        <div className="mt-7 border-t border-white/15 pt-4 text-[11px] leading-6 text-slate-400">
          {s?.origin} → {s?.destination}
          <br />
          Estimated savings after fees · Gross margin before overheads
          <br />
          Sample rates, not guaranteed results
        </div>
      </div>
    </div>
  );
}
