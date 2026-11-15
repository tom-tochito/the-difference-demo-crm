"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw, Check, Layers, Activity } from "lucide-react";
import { toast } from "sonner";
import {
  useClock,
  Action,
  Badge,
  Panel,
  Empty,
  date,
  Select,
  inputClass,
} from "./shared";
import { clientHref } from "./navigation";
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
export function Sources({ readOnly = false }: { readOnly?: boolean }) {
  const now = useClock();
  const rows = useQuery(api.dataSources.sources),
    user = useQuery(api.users.currentUser);
  const refresh = useMutation(api.dataSources.refresh);
  if (!rows) return <Loading />;
  return (
    <div className="workspace-page">
      <PageHeading
        label="Future integrations · Simulated data"
        title="Connected information. One place to work."
        description="A preview of how supplier schedules, tracking and rates could connect to your freight service. All sources below are simulated; no external provider is connected."
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
              {user?.role === "superadmin" && !readOnly ? (
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
          The demo refresh changes deterministic sample observations and updates
          source timestamps; it does not contact carriers or change shipment
          pricing.
        </p>
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
        description="Give each teammate access to the jobs they manage. Client admins handle quotation approval and team assignments."
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
            Platform operations, client accounts, finance and global demo
            settings.
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
  const params = useSearchParams();
  const router = useRouter();
  const company =
    data?.companies.find((c) => c.id === params.get("customer")) ??
    data?.companies[0];
  const view = params.get("view") ?? "overview";
  if (!data) return <Loading />;
  if (!company) return <Empty>No client companies are available.</Empty>;
  return (
    <>
      <div className="mx-auto max-w-[1440px] px-5 pt-6 sm:px-8 xl:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
          <div>
            <p className="text-sm font-semibold text-teal-950">
              Client preview · Read only
            </p>
            <p className="mt-1 text-xs text-teal-800">
              Explore the client workspace without changing records.
            </p>
          </div>
          <Select
            label="Client company"
            value={company.id}
            onChange={(customer) =>
              router.replace(clientHref("overview", {}, customer))
            }
            options={data.companies.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
        </div>
      </div>
      {view === "sources" ? (
        <Sources readOnly />
      ) : (
        <ClientWorkspace
          key={`${company.id}:${view}`}
          section={view}
          previewCustomer={company.id}
        />
      )}
    </>
  );
}
export function Loading() {
  return (
    <div className="p-10 text-sm text-slate-600">Loading your workspace…</div>
  );
}
