"use client";
import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  DOCUMENT_TYPES,
  total,
  type Charge,
} from "../../../convex/shippingModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { dayInput, inputClass, money, useShipping } from "./shared";
export type EditKind =
  | "company"
  | "contact"
  | "enquiry"
  | "quote"
  | "booking"
  | "shipment"
  | "task"
  | "note"
  | "document"
  | "payment"
  | "resolveTask"
  | "resolveException";
export type EditRequest = {
  kind: EditKind;
  record?: Record<string, unknown>;
  customerId?: string;
  shipmentId?: string;
};
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  value?: string | number;
  min?: number;
  step?: string;
};
const options = (items: readonly string[]) =>
  items.map((s) => ({ value: s, label: s }));
export function Editor({
  request,
  close,
}: {
  request: EditRequest;
  close: () => void;
}) {
  const { data, now } = useShipping();
  const r = request.record ?? {};
  const kind = request.kind;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(String(r.mode ?? "sea"));
  const [currency, setCurrency] = useState(String(r.currency ?? "GBP"));
  const [charges, setCharges] = useState<Charge[]>(
    (r.charges as Charge[] | undefined) ?? [
      {
        description: "Demo freight",
        quantity: 1,
        unitMinor: 180000,
        costMinor: 125000,
      },
      {
        description: "Handling & documentation",
        quantity: 1,
        unitMinor: 30000,
        costMinor: 18000,
      },
    ],
  );
  const saveCompany = useMutation(api.shipping.saveCompany),
    saveContact = useMutation(api.shipping.saveContact),
    saveEnquiry = useMutation(api.shipping.saveEnquiry),
    saveQuote = useMutation(api.shipping.saveQuote),
    createBooking = useMutation(api.shipping.createBooking),
    saveShipment = useMutation(api.shipping.saveShipment),
    addTask = useMutation(api.shipping.addTask),
    addNote = useMutation(api.shipping.addNote),
    saveDocument = useMutation(api.shipping.saveDocument),
    uploadUrl = useMutation(api.shipping.uploadUrl),
    recordPayment = useMutation(api.shipping.recordPayment),
    completeTask = useMutation(api.shipping.completeTask),
    resolveException = useMutation(api.shipping.resolveException);
  const [requestId] = useState(() => crypto.randomUUID());
  const customerOptions = data.companies.map((c) => ({
    value: c._id,
    label: c.name,
  }));
  const shipmentOptions = [
    { value: "", label: "Customer only" },
    ...data.shipments.map((s) => ({
      value: s._id,
      label: `${s.reference} · ${s.origin} → ${s.destination}`,
    })),
  ];
  let fields: Field[] = [];
  const customer: Field = {
    key: "customerId",
    label: "Company",
    options: customerOptions,
    value: request.customerId,
    required: true,
  };
  const isRoute = ["enquiry", "quote", "booking", "shipment"].includes(kind);
  if (isRoute)
    fields = [
      customer,
      {
        key: "mode",
        label: "Transport mode",
        options: options(["sea", "air", "road"]),
      },
      {
        key: "origin",
        label: "Origin",
        required: true,
        value: "Southampton, GB",
      },
      {
        key: "destination",
        label: "Destination",
        required: true,
        value: "New York, US",
      },
      {
        key: "cargo",
        label: "Cargo description",
        required: true,
        value: "Precision components",
      },
      {
        key: "packages",
        label: "Packages",
        type: "number",
        min: 1,
        step: "1",
        value: 10,
      },
      {
        key: "weightKg",
        label: "Gross weight (kg)",
        type: "number",
        min: 0.001,
        step: "any",
        value: 1200,
      },
      {
        key: "volumeM3",
        label: "Volume (m³)",
        type: "number",
        min: 0,
        step: "any",
        value: 4,
      },
      {
        key: "dimensions",
        label: "Package dimensions",
        value: "120 × 100 × 140 cm",
      },
      ...(mode === "sea"
        ? [
            {
              key: "containers",
              label: "Container number / type",
              value: "1 × 40ft HC",
            },
          ]
        : []),
      {
        key: "etd",
        label: "Departure",
        type: "date",
        value: dayInput(now + 7 * 86400000),
        required: true,
      },
      {
        key: "eta",
        label: "Arrival",
        type: "date",
        value: dayInput(now + 28 * 86400000),
        required: true,
      },
      {
        key: "incoterm",
        label: "Incoterm (demo)",
        options: options([
          "EXW",
          "FCA",
          "FOB",
          "CFR",
          "CIF",
          "CPT",
          "CIP",
          "DAP",
          "DPU",
          "DDP",
        ]),
      },
      {
        key: "currency",
        label: "Currency",
        options: options(["GBP", "EUR", "USD"]),
      },
    ];
  if (isRoute && kind !== "shipment")
    fields.push({
      key: "validity",
      label: "Quote valid until",
      type: "date",
      value: dayInput(now + 14 * 86400000),
      required: true,
    });
  if (kind === "shipment")
    fields.push(
      ...[
        {
          key: "carrier",
          label: "Carrier",
          value: "Demo carrier",
          required: true,
        },
        { key: "service", label: "Service", value: "Standard export" },
        {
          key: "operator",
          label: "Assigned operator",
          value: "James Morgan",
          required: true,
        },
        { key: "shipper", label: "Shipper", required: true },
        { key: "consignee", label: "Consignee", required: true },
        {
          key: "notifyParty",
          label: "Notify party",
          value: "Same as consignee",
        },
        {
          key: "transportRef",
          label:
            mode === "sea"
              ? "Bill of lading reference"
              : mode === "air"
                ? "Airway bill reference"
                : "CMR reference",
        },
        {
          key: "transportName",
          label:
            mode === "sea"
              ? "Vessel / voyage"
              : mode === "air"
                ? "Flight"
                : "Vehicle / trailer",
        },
        ...(mode === "sea" ? [{ key: "seal", label: "Seal number" }] : []),
        { key: "stops", label: "Transshipment stops" },
      ],
    );
  if (kind === "company")
    fields = [
      { key: "name", label: "Company name", required: true },
      {
        key: "role",
        label: "Company role",
        options: options([
          "Exporter",
          "Consignee",
          "Freight partner",
          "Shipping agent",
        ]),
      },
      { key: "country", label: "Country", required: true },
      { key: "address", label: "Address", required: true },
      {
        key: "owner",
        label: "Account owner",
        value: "James Morgan",
        required: true,
      },
      { key: "tradeLanes", label: "Trade lanes" },
      {
        key: "preferredMode",
        label: "Preferred mode",
        options: options(["sea", "air", "road"]),
      },
      {
        key: "paymentDays",
        label: "Payment terms (days)",
        type: "number",
        min: 0,
        step: "1",
        value: 30,
      },
    ];
  if (kind === "contact")
    fields = [
      customer,
      { key: "name", label: "Contact name", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone" },
      { key: "title", label: "Job title" },
    ];
  if (kind === "task")
    fields = [
      customer,
      {
        key: "shipmentId",
        label: "Shipment",
        options: shipmentOptions,
        value: request.shipmentId,
      },
      { key: "title", label: "Task title", required: true },
      {
        key: "assignee",
        label: "Assignee",
        required: true,
        value: "Sofia Chen",
      },
      {
        key: "priority",
        label: "Priority",
        options: options(["Normal", "High", "Low"]),
      },
      {
        key: "dueAt",
        label: "Due date",
        type: "date",
        required: true,
        value: dayInput(now + 86400000),
      },
    ];
  if (kind === "note")
    fields = [
      { key: "body", label: "Note / update", type: "textarea", required: true },
      {
        key: "public",
        label: "Visibility",
        options: [
          { value: "false", label: "Internal note" },
          { value: "true", label: "Customer-visible update" },
        ],
      },
    ];
  if (kind === "document")
    fields = [
      {
        key: "shipmentId",
        label: "Shipment",
        options: shipmentOptions.slice(1),
        value: request.shipmentId,
        required: true,
      },
      { key: "type", label: "Document type", options: options(DOCUMENT_TYPES) },
      {
        key: "status",
        label: "Status",
        options: options(["Missing", "Draft", "Awaiting approval", "Approved"]),
      },
      { key: "owner", label: "Owner", required: true, value: "Sofia Chen" },
      {
        key: "shared",
        label: "Visibility",
        options: [
          { value: "false", label: "Internal" },
          { value: "true", label: "Share document with customer" },
        ],
      },
      {
        key: "file",
        label: "Attachment (PDF, image or text, up to 10 MB)",
        type: "file",
      },
    ];
  if (kind === "payment")
    fields = [
      {
        key: "amount",
        label: `Demo payment (${r.currency})`,
        type: "number",
        value: Number(r.balance ?? 0) / 100,
        min: 0.01,
        step: "0.01",
        required: true,
      },
      {
        key: "reference",
        label: "Payment reference",
        value: "Demo bank receipt",
        required: true,
      },
    ];
  if (kind === "resolveTask" || kind === "resolveException")
    fields = [
      {
        key: "resolution",
        label: "Resolution notes",
        type: "textarea",
        required: true,
      },
    ];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    const num = (k: string) => Number(str(k));
    const dt = (k: string) => new Date(str(k) + "T12:00:00Z").getTime();
    try {
      const customerId = str("customerId") as Id<"shippingCompanies">;
      const shipmentId = (str("shipmentId") ||
        request.shipmentId ||
        undefined) as Id<"shippingShipments"> | undefined;
      if (kind === "company")
        await saveCompany({
          id: r._id as Id<"shippingCompanies"> | undefined,
          data: {
            name: str("name"),
            role: str("role") as Doc<"shippingCompanies">["role"],
            country: str("country"),
            address: str("address"),
            owner: str("owner"),
            tradeLanes: str("tradeLanes"),
            preferredMode: str("preferredMode") as "sea" | "air" | "road",
            paymentDays: num("paymentDays"),
          },
        });
      if (kind === "contact")
        await saveContact({
          id: r._id as Id<"shippingContacts"> | undefined,
          customerId,
          name: str("name"),
          email: str("email"),
          phone: str("phone"),
          title: str("title"),
        });
      if (isRoute) {
        const route = {
          customerId,
          mode: mode as "sea" | "air" | "road",
          origin: str("origin"),
          destination: str("destination"),
          cargo: str("cargo"),
          packages: num("packages"),
          weightKg: num("weightKg"),
          volumeM3: num("volumeM3"),
          dimensions: str("dimensions"),
          containers: mode === "sea" ? str("containers") : "",
          etd: dt("etd"),
          eta: dt("eta"),
          incoterm: str("incoterm"),
          currency: currency as "GBP" | "EUR" | "USD",
        };
        const quoted = { ...route, validity: dt("validity"), charges };
        if (kind === "enquiry") await saveEnquiry({ data: quoted });
        if (kind === "quote")
          await saveQuote({
            id: r._id as Id<"shippingQuotes"> | undefined,
            data: quoted,
          });
        if (kind === "booking")
          await createBooking({
            id: r._id as Id<"shippingBookings"> | undefined,
            data: quoted,
          });
        if (kind === "shipment")
          await saveShipment({
            id: r._id as Id<"shippingShipments"> | undefined,
            charges,
            data: {
              ...route,
              carrier: str("carrier"),
              service: str("service"),
              operator: str("operator"),
              shipper: str("shipper"),
              consignee: str("consignee"),
              notifyParty: str("notifyParty"),
              transportRef: str("transportRef"),
              transportName: str("transportName"),
              seal: mode === "sea" ? str("seal") : "",
              stops: str("stops"),
            },
          });
      }
      if (kind === "task")
        await addTask({
          customerId,
          shipmentId,
          title: str("title"),
          assignee: str("assignee"),
          priority: str("priority") as "Low" | "Normal" | "High",
          dueAt: dt("dueAt"),
        });
      if (kind === "note")
        await addNote({
          customerId: request.customerId as Id<"shippingCompanies"> | undefined,
          shipmentId: request.shipmentId as Id<"shippingShipments"> | undefined,
          body: str("body"),
          public: str("public") === "true",
        });
      if (kind === "document") {
        let storageId: Id<"_storage"> | undefined;
        let filename: string | undefined;
        const file = f.get("file");
        if (file instanceof File && file.size) {
          if (
            file.size > 10485760 ||
            ![
              "application/pdf",
              "image/png",
              "image/jpeg",
              "text/plain",
            ].includes(file.type)
          )
            throw new Error(
              "Choose a PDF, PNG, JPEG or plain text file up to 10 MB.",
            );
          const url = await uploadUrl({});
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!response.ok) throw new Error("Upload failed. Please retry.");
          const result = await response.json();
          if (
            !result ||
            typeof result !== "object" ||
            !("storageId" in result) ||
            typeof result.storageId !== "string"
          )
            throw new Error("Invalid upload response");
          storageId = result.storageId as Id<"_storage">;
          filename = file.name;
        }
        await saveDocument({
          id: r._id as Id<"shippingDocuments"> | undefined,
          shipmentId: shipmentId!,
          type: str("type") as (typeof DOCUMENT_TYPES)[number],
          status: str("status") as Doc<"shippingDocuments">["status"],
          owner: str("owner"),
          shared: str("shared") === "true",
          ...(storageId ? { storageId, filename } : {}),
        });
      }
      if (kind === "payment")
        await recordPayment({
          id: r._id as Id<"shippingInvoices">,
          amountMinor: Math.round(num("amount") * 100),
          requestId,
          reference: str("reference"),
        });
      if (kind === "resolveTask")
        await completeTask({
          id: r._id as Id<"shippingTasks">,
          resolution: str("resolution"),
        });
      if (kind === "resolveException")
        await resolveException({
          id: r._id as Id<"shippingExceptions">,
          resolution: str("resolution"),
        });
      toast.success(
        kind === "payment"
          ? "Demo payment recorded. No money was charged."
          : "Saved successfully",
      );
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {kind === "resolveTask" || kind === "resolveException"
              ? "Resolve with a note"
              : `${r._id ? "Edit" : "New"} ${kind}`}
          </DialogTitle>
          <DialogDescription>
            {isRoute
              ? "Demo rates only. All amounts are illustrative; no external bookings or messages are sent."
              : "Changes are saved to the freight workspace."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const raw = r[field.key];
              const value =
                field.type === "date" && typeof raw === "number"
                  ? dayInput(raw)
                  : raw !== undefined
                    ? String(raw)
                    : String(field.value ?? field.options?.[0]?.value ?? "");
              return (
                <label
                  key={field.key}
                  className={`space-y-1.5 text-xs font-medium text-zinc-600 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
                >
                  <span>
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  {field.options ? (
                    <select
                      name={field.key}
                      required={field.required}
                      className={inputClass}
                      {...(field.key === "mode"
                        ? {
                            value: mode,
                            onChange: (
                              e: React.ChangeEvent<HTMLSelectElement>,
                            ) => setMode(e.target.value),
                          }
                        : field.key === "currency"
                          ? {
                              value: currency,
                              onChange: (
                                e: React.ChangeEvent<HTMLSelectElement>,
                              ) => setCurrency(e.target.value),
                            }
                          : { defaultValue: value })}
                    >
                      {field.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      name={field.key}
                      required={field.required}
                      defaultValue={value}
                      maxLength={2000}
                      className={`${inputClass} h-24 py-2`}
                    />
                  ) : (
                    <input
                      name={field.key}
                      type={field.type ?? "text"}
                      required={field.required ?? field.type === "number"}
                      defaultValue={field.type === "file" ? undefined : value}
                      min={field.min}
                      step={field.step}
                      maxLength={2000}
                      accept={
                        field.type === "file"
                          ? ".pdf,.png,.jpg,.jpeg,.txt"
                          : undefined
                      }
                      className={inputClass}
                    />
                  )}
                </label>
              );
            })}
          </div>
          {isRoute && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <h3 className="font-semibold">Charge lines · {currency}</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={charges.length >= 30}
                  onClick={() =>
                    setCharges([
                      ...charges,
                      {
                        description: "",
                        quantity: 1,
                        unitMinor: 0,
                        costMinor: 0,
                      },
                    ])
                  }
                >
                  Add charge
                </Button>
              </div>
              {charges.map((c, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 gap-2 rounded-lg border bg-zinc-50 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                >
                  {(
                    [
                      {
                        key: "description",
                        label: "Description",
                        value: c.description,
                      },
                      { key: "quantity", label: "Qty", value: c.quantity },
                      {
                        key: "unitMinor",
                        label: "Unit price",
                        value: c.unitMinor / 100,
                      },
                      {
                        key: "costMinor",
                        label: "Unit cost",
                        value: c.costMinor / 100,
                      },
                    ] as const
                  ).map((f) => (
                    <label key={f.key} className="text-[10px] text-zinc-600">
                      {f.label}
                      <input
                        aria-label={`${f.label} ${i + 1}`}
                        className={inputClass}
                        required
                        type={f.key === "description" ? "text" : "number"}
                        min={f.key === "quantity" ? 0.001 : 0}
                        step={f.key === "quantity" ? "any" : "0.01"}
                        value={f.value}
                        onChange={(e) =>
                          setCharges(
                            charges.map((line, j) =>
                              j !== i
                                ? line
                                : {
                                    ...line,
                                    [f.key]:
                                      f.key === "description"
                                        ? e.target.value
                                        : f.key === "quantity"
                                          ? Number(e.target.value)
                                          : Math.round(
                                              Number(e.target.value) * 100,
                                            ),
                                  },
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <Button
                    className="self-end"
                    type="button"
                    variant="ghost"
                    disabled={charges.length === 1}
                    onClick={() =>
                      setCharges(charges.filter((_, j) => j !== i))
                    }
                    aria-label={`Remove charge ${i + 1}`}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <p className="text-right text-lg font-semibold">
                Total {money(total(charges), currency)}
              </p>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              {busy
                ? "Saving…"
                : kind === "payment"
                  ? "Record demo payment"
                  : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
