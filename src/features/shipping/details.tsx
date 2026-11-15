"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { total, cost } from "../../../convex/shippingModel";
import { Button } from "@/components/ui/button";
import {
  Action,
  ActivityList,
  Badge,
  company,
  date,
  DocumentDownload,
  Empty,
  Mode,
  money,
  Panel,
  readiness,
  RecordLink,
  RouteVisual,
  Timeline,
  useShipping,
} from "./shared";
import type { EditRequest } from "./editor";
import type { PrintRequest } from "./print-preview";
type Props = {
  edit: (r: EditRequest) => void;
  print: (r: PrintRequest) => void;
};
export function ShipmentDetail({
  s,
  edit,
  print,
}: Props & { s: Doc<"shippingShipments"> }) {
  const { data } = useShipping();
  const [tab, setTab] = useState("Overview");
  const advance = useMutation(api.shipping.advanceShipment);
  const invoice = useMutation(api.shipping.createInvoice);
  const ready = readiness(data, s);
  const docs = data.documents.filter((d) => d.shipmentId === s._id);
  const tasks = data.tasks.filter((t) => t.shipmentId === s._id);
  const exceptions = data.exceptions.filter((e) => e.shipmentId === s._id);
  return (
    <div className="space-y-6">
      <Link
        href="/shipping/shipments"
        className="text-sm text-zinc-600 hover:text-indigo-600"
      >
        ← Shipment register
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {s.reference}
            </h1>
            <Badge>{s.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            <RecordLink section="customers" id={s.customerId}>
              {company(data, s.customerId)}
            </RecordLink>{" "}
            · <Mode mode={s.mode} /> · Updated {date(s.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => edit({ kind: "shipment", record: s })}
          >
            Edit shipment
          </Button>
          <Action
            disabled={s.status === "Delivered"}
            onClick={() => advance({ id: s._id, expectedStatus: s.status })}
          >
            Simulate tracking update
          </Action>
        </div>
      </div>
      <RouteVisual {...s} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Departure", date(s.etd)],
          ["Estimated arrival", date(s.eta)],
          ["Assigned operator", s.operator],
          ["Document readiness", `${ready.ready} / ${ready.total} approved`],
        ].map(([label, value]) => (
          <Panel key={label}>
            <p className="text-xs text-zinc-600">{label}</p>
            <p className="mt-2 font-semibold">{value}</p>
          </Panel>
        ))}
      </div>
      {(ready.missing.length > 0 || exceptions.some((e) => !e.resolved)) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {ready.missing.length > 0 && (
            <p>Documents need attention: {ready.missing.join(", ")}</p>
          )}
          {exceptions
            .filter((e) => !e.resolved)
            .map((e) => (
              <p key={e._id} className="mt-1">
                {e.title}
              </p>
            ))}
        </div>
      )}
      <div
        className="flex gap-1 overflow-x-auto border-b"
        role="tablist"
        aria-label="Shipment detail sections"
      >
        {[
          "Overview",
          "Tracking",
          "Documents",
          "Finance",
          "Tasks & exceptions",
          "Activity",
        ].map((t) => (
          <button
            role="tab"
            aria-selected={t === tab}
            tabIndex={t === tab ? 0 : -1}
            onKeyDown={(e) => {
              const tabs = [
                "Overview",
                "Tracking",
                "Documents",
                "Finance",
                "Tasks & exceptions",
                "Activity",
              ];
              const index = tabs.indexOf(t);
              const next =
                e.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : e.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? tabs.length - 1
                        : -1;
              if (next >= 0) {
                e.preventDefault();
                setTab(tabs[next]);
                (
                  e.currentTarget.parentElement?.children[next] as HTMLElement
                )?.focus();
              }
            }}
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm ${tab === t ? "border-indigo-600 font-semibold text-indigo-700" : "border-transparent text-zinc-600"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Parties & cargo">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
              {[
                ["Shipper", s.shipper],
                ["Consignee", s.consignee],
                ["Notify party", s.notifyParty],
                ["Cargo", s.cargo],
                ["Packages", s.packages],
                ["Gross weight", `${s.weightKg.toLocaleString()} kg`],
                ["Volume", `${s.volumeM3.toFixed(1)} m³`],
                ["Dimensions", s.dimensions],
                ["Incoterm", s.incoterm],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-zinc-600">{k}</dt>
                  <dd className="mt-1">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Transport plan">
            <dl className="grid grid-cols-2 gap-5 text-sm">
              {[
                ["Carrier", s.carrier],
                ["Service", s.service],
                [
                  s.mode === "sea"
                    ? "Vessel / voyage"
                    : s.mode === "air"
                      ? "Flight"
                      : "Vehicle",
                  s.transportName,
                ],
                [
                  s.mode === "sea"
                    ? "Bill of lading"
                    : s.mode === "air"
                      ? "Airway bill"
                      : "CMR",
                  s.transportRef,
                ],
                ...(s.mode === "sea"
                  ? [
                      ["Containers", s.containers],
                      ["Seal", s.seal],
                    ]
                  : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-zinc-600">{k}</dt>
                  <dd className="mt-1">{v || "Not assigned"}</dd>
                </div>
              ))}
            </dl>
            {s.bookingId && (
              <p className="mt-5 border-t pt-4 text-sm">
                Booking:{" "}
                <RecordLink section="bookings" id={s.bookingId}>
                  {data.bookings.find((b) => b._id === s.bookingId)?.reference}
                </RecordLink>
              </p>
            )}
          </Panel>
        </div>
      )}
      {tab === "Tracking" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Planned & actual milestones">
            <Timeline milestones={s.milestones} />
          </Panel>
          <Panel title="Tracking updates">
            <p className="mb-5 text-sm text-zinc-600">
              Tracking is simulated. Each update advances one milestone and is
              visible across operations and the customer preview.
            </p>
            <ActivityList
              items={data.activities.filter(
                (a) => a.shipmentId === s._id && a.public,
              )}
            />
          </Panel>
        </div>
      )}
      {tab === "Documents" && (
        <Panel
          title="Export document checklist"
          action={
            <Button
              size="sm"
              onClick={() => edit({ kind: "document", shipmentId: s._id })}
            >
              Attach document
            </Button>
          }
        >
          <p className="mb-4 text-xs text-zinc-600">
            Configurable demo requirements only; not a legal or customs
            compliance assessment.
          </p>
          <div className="space-y-3">
            {ready.missing
              .filter((type) => !docs.some((d) => d.type === type))
              .map((type) => (
                <div
                  className="flex items-center justify-between rounded border border-amber-200 p-3"
                  key={type}
                >
                  <span>
                    {type} <Badge>Missing</Badge>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      edit({
                        kind: "document",
                        shipmentId: s._id,
                        record: { type },
                      })
                    }
                  >
                    Create
                  </Button>
                </div>
              ))}
            {docs.map((d) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                key={d._id}
              >
                <div>
                  <p className="font-medium">{d.type}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {d.owner} · {date(d.updatedAt)} ·{" "}
                    {d.shared ? "Customer shared" : "Internal"}
                  </p>
                </div>
                <Badge>{d.status}</Badge>
                <div className="flex flex-wrap gap-2">
                  {d.storageId ? (
                    <DocumentDownload id={d._id} />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => print({ type: d.type, record: s })}
                    >
                      Preview / PDF
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      edit({ kind: "document", record: d, shipmentId: s._id })
                    }
                  >
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "Finance" && (
        <div className="space-y-5">
          <Panel
            title={`Shipment charges · ${s.currency}`}
            action={
              <Action
                onClick={async () => {
                  const id = await invoice({ shipmentId: s._id });
                  window.location.assign(`/shipping/finance?id=${id}`);
                }}
              >
                Create / open invoice
              </Action>
            }
          >
            <ChargeTable charges={s.charges} currency={s.currency} />
            <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
              <div>
                Revenue
                <p className="mt-1 font-semibold">
                  {money(total(s.charges), s.currency)}
                </p>
              </div>
              <div>
                Estimated cost
                <p className="mt-1 font-semibold">
                  {money(cost(s.charges), s.currency)}
                </p>
              </div>
              <div>
                Estimated margin
                <p className="mt-1 font-semibold text-emerald-700">
                  {money(total(s.charges) - cost(s.charges), s.currency)}
                </p>
              </div>
            </div>
          </Panel>
          {data.invoices
            .filter((i) => i.shipmentId === s._id)
            .map((i) => (
              <Panel key={i._id}>
                <RecordLink section="finance" id={i._id}>
                  {i.reference}
                </RecordLink>{" "}
                <Badge>{i.status}</Badge>
                <p className="mt-2 text-sm">
                  Balance {money(i.balance, i.currency)} · Due {date(i.dueAt)}
                </p>
              </Panel>
            ))}
        </div>
      )}
      {tab === "Tasks & exceptions" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            title="Tasks"
            action={
              <Button
                size="sm"
                onClick={() =>
                  edit({
                    kind: "task",
                    shipmentId: s._id,
                    customerId: s.customerId,
                  })
                }
              >
                Add task
              </Button>
            }
          >
            {tasks.length ? (
              tasks.map((t) => (
                <div
                  key={t._id}
                  className="space-y-2 border-b py-3 last:border-0"
                >
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-zinc-600">
                    {t.assignee} · Due {date(t.dueAt)}
                  </p>
                  {t.done ? (
                    <>
                      <Badge>Complete</Badge>
                      <p className="text-sm">{t.resolution}</p>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => edit({ kind: "resolveTask", record: t })}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <Empty>No tasks yet.</Empty>
            )}
          </Panel>
          <Panel title="Operational exceptions">
            {exceptions.length ? (
              exceptions.map((e) => (
                <div key={e._id} className="space-y-2 border-b py-3">
                  <p className="text-sm">{e.title}</p>
                  {e.resolved ? (
                    <p className="text-sm text-emerald-700">
                      Resolved: {e.resolution}
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        edit({ kind: "resolveException", record: e })
                      }
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <Empty>No operational exceptions.</Empty>
            )}
          </Panel>
        </div>
      )}
      {tab === "Activity" && (
        <Panel
          title="Notes & activity"
          action={
            <Button
              size="sm"
              onClick={() =>
                edit({
                  kind: "note",
                  shipmentId: s._id,
                  customerId: s.customerId,
                })
              }
            >
              Add note / update
            </Button>
          }
        >
          <ActivityList
            items={data.activities.filter((a) => a.shipmentId === s._id)}
          />
        </Panel>
      )}
    </div>
  );
}
export function ChargeTable({
  charges,
  currency,
}: {
  charges: Doc<"shippingQuotes">["charges"];
  currency: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-600">
            <th className="pb-3 text-left">Charge</th>
            <th className="text-right">Quantity</th>
            <th className="text-right">Unit rate</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((c, i) => (
            <tr key={i} className="border-t">
              <td className="py-3">{c.description}</td>
              <td className="text-right">{c.quantity}</td>
              <td className="text-right">{money(c.unitMinor, currency)}</td>
              <td className="text-right">
                {money(Math.round(c.quantity * c.unitMinor), currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t pt-4 text-right font-semibold">
        Total {money(total(charges), currency)}
      </p>
    </div>
  );
}
export function CustomerDetail({
  c,
  edit,
}: Props & { c: Doc<"shippingCompanies"> }) {
  const { data } = useShipping();
  return (
    <div className="space-y-6">
      <Link href="/shipping/customers" className="text-sm text-zinc-600">
        ← Customers
      </Link>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{c.name}</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {c.country} · {c.role} · Account owner {c.owner}
          </p>
        </div>
        <Button onClick={() => edit({ kind: "company", record: c })}>
          Edit company
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Account profile">
          <dl className="space-y-4 text-sm">
            {[
              ["Address", c.address],
              ["Trade lanes", c.tradeLanes],
              ["Preferred mode", c.preferredMode],
              ["Payment terms", `${c.paymentDays} days`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-zinc-600">{k}</dt>
                <dd className="mt-1">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel
          title="Contacts"
          action={
            <Button
              size="sm"
              onClick={() => edit({ kind: "contact", customerId: c._id })}
            >
              Add contact
            </Button>
          }
        >
          {data.contacts
            .filter((contact) => contact.customerId === c._id)
            .map((contact) => (
              <div
                className="flex justify-between gap-2 border-b py-3 last:border-0"
                key={contact._id}
              >
                <div>
                  <p className="text-sm font-medium">
                    {contact.name} · {contact.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {contact.email}
                    <br />
                    {contact.phone}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => edit({ kind: "contact", record: contact })}
                >
                  Edit
                </Button>
              </div>
            ))}
        </Panel>
      </div>
      <Panel title="Related operations">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Enquiries", section: "enquiries", rows: data.enquiries },
            { label: "Quotations", section: "quotes", rows: data.quotes },
            { label: "Bookings", section: "bookings", rows: data.bookings },
            { label: "Shipments", section: "shipments", rows: data.shipments },
            { label: "Invoices", section: "finance", rows: data.invoices },
          ].map((group) => (
            <div key={group.label}>
              <h3 className="mb-3 text-xs font-semibold uppercase text-zinc-600">
                {group.label}
              </h3>
              <div className="space-y-2 text-sm">
                {group.rows
                  .filter((row) => row.customerId === c._id)
                  .map((row) => (
                    <div key={row._id}>
                      <RecordLink section={group.section} id={row._id}>
                        {row.reference}
                      </RecordLink>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3 border-t pt-4 text-sm">
          <Link
            className="text-indigo-700 underline"
            href={`/shipping/documents?customer=${c._id}`}
          >
            Customer documents
          </Link>
          <Link
            className="text-indigo-700 underline"
            href={`/shipping/tasks?customer=${c._id}`}
          >
            Customer tasks
          </Link>
        </div>
      </Panel>
      <Panel
        title="Customer timeline"
        action={
          <Button
            size="sm"
            onClick={() => edit({ kind: "note", customerId: c._id })}
          >
            Add note
          </Button>
        }
      >
        <ActivityList
          items={data.activities.filter((a) => a.customerId === c._id)}
        />
      </Panel>
    </div>
  );
}
export function InvoiceDetail({ id, edit, print }: Props & { id: string }) {
  const { data } = useShipping();
  const issue = useMutation(api.shipping.issueInvoice);
  const i = data.invoices.find((row) => row._id === id);
  if (!i) return <Empty>Invoice not found.</Empty>;
  return (
    <div className="space-y-6">
      <Link href="/shipping/finance" className="text-sm text-zinc-600">
        ← Finance
      </Link>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{i.reference}</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {company(data, i.customerId)} · Due {date(i.dueAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{i.status}</Badge>
          <Button
            variant="outline"
            onClick={() => print({ type: "Customer invoice", record: i })}
          >
            Preview / PDF
          </Button>
          {!i.issued ? (
            <Action onClick={() => issue({ id: i._id })}>
              Issue demo invoice
            </Action>
          ) : (
            i.balance > 0 && (
              <Button onClick={() => edit({ kind: "payment", record: i })}>
                Record demo payment
              </Button>
            )
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Invoice total", i.total],
          ["Paid", i.paid],
          ["Balance", i.balance],
        ].map(([k, v]) => (
          <Panel key={k}>
            <p className="text-xs text-zinc-600">{k}</p>
            <p className="mt-2 text-lg font-semibold">
              {money(Number(v), i.currency)}
            </p>
          </Panel>
        ))}
      </div>
      <Panel title="Itemized charges">
        <ChargeTable charges={i.charges} currency={i.currency} />
        <p className="mt-4 text-sm">
          Shipment:{" "}
          <RecordLink section="shipments" id={i.shipmentId}>
            {data.shipments.find((s) => s._id === i.shipmentId)?.reference}
          </RecordLink>
        </p>
      </Panel>
      <Panel title="Demo payment history">
        {data.payments
          .filter((p) => p.invoiceId === i._id)
          .map((p) => (
            <div
              key={p._id}
              className="flex justify-between border-b py-3 text-sm"
            >
              <span>
                {p.reference} · {date(p.receivedAt)}
              </span>
              <strong>{money(p.amountMinor, i.currency)}</strong>
            </div>
          ))}
        <p className="mt-4 text-xs text-zinc-600">
          Payments are simulated records. No money is charged or transferred.
        </p>
      </Panel>
    </div>
  );
}
