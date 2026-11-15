import { v } from "convex/values";

export const modeV = v.union(
  v.literal("sea"),
  v.literal("air"),
  v.literal("road"),
);
export const currencyV = v.union(
  v.literal("GBP"),
  v.literal("EUR"),
  v.literal("USD"),
);
export const stageV = v.union(
  ...[
    "New Enquiry",
    "Preparing Quote",
    "Quote Sent",
    "Negotiation",
    "Won",
    "Lost",
  ].map((s) => v.literal(s)),
);
export const chargeV = v.object({
  description: v.string(),
  quantity: v.number(),
  unitMinor: v.number(),
  costMinor: v.number(),
});
export const routeFields = {
  customerId: v.id("shippingCompanies"),
  origin: v.string(),
  destination: v.string(),
  mode: modeV,
  cargo: v.string(),
  weightKg: v.number(),
  volumeM3: v.number(),
  packages: v.number(),
  dimensions: v.string(),
  containers: v.string(),
  etd: v.number(),
  eta: v.number(),
  incoterm: v.string(),
  currency: currencyV,
};
export const companyV = v.object({
  name: v.string(),
  role: v.union(
    v.literal("Exporter"),
    v.literal("Consignee"),
    v.literal("Freight partner"),
    v.literal("Shipping agent"),
  ),
  country: v.string(),
  address: v.string(),
  owner: v.string(),
  tradeLanes: v.string(),
  preferredMode: modeV,
  paymentDays: v.number(),
});
export const quoteV = v.object({
  ...routeFields,
  validity: v.number(),
  charges: v.array(chargeV),
});
export const shipmentFields = {
  ...routeFields,
  carrier: v.string(),
  service: v.string(),
  operator: v.string(),
  shipper: v.string(),
  consignee: v.string(),
  notifyParty: v.string(),
  transportRef: v.string(),
  transportName: v.string(),
  seal: v.string(),
  stops: v.string(),
};
export const shipmentV = v.object(shipmentFields);
export const milestoneV = v.object({
  name: v.string(),
  planned: v.number(),
  actual: v.optional(v.number()),
});
export const DOCUMENT_TYPES = [
  "Commercial invoice",
  "Packing list",
  "Bill of lading",
  "Airway bill",
  "Certificate of origin",
  "Export declaration",
  "Insurance certificate",
  "CMR consignment note",
] as const;
export const documentTypeV = v.union(
  ...DOCUMENT_TYPES.map((s) => v.literal(s)),
);
export const docStatusV = v.union(
  v.literal("Missing"),
  v.literal("Draft"),
  v.literal("Awaiting approval"),
  v.literal("Approved"),
);
export const STAGES = [
  "New Enquiry",
  "Preparing Quote",
  "Quote Sent",
  "Negotiation",
  "Won",
  "Lost",
] as const;
export const STATUSES = [
  "Planning",
  "Booked",
  "Departed",
  "In transit",
  "Arrived",
  "Delivered",
] as const;
export const DAY = 86400000;
export const defaultRequirements = {
  sea: [
    "Commercial invoice",
    "Packing list",
    "Bill of lading",
    "Certificate of origin",
  ],
  air: ["Commercial invoice", "Packing list", "Airway bill"],
  road: ["Commercial invoice", "Packing list", "CMR consignment note"],
} as const;
export type Charge = {
  description: string;
  quantity: number;
  unitMinor: number;
  costMinor: number;
};
export function total(charges: Charge[]) {
  return charges.reduce(
    (sum, c) => sum + Math.round(c.quantity * c.unitMinor),
    0,
  );
}
export function cost(charges: Charge[]) {
  return charges.reduce(
    (sum, c) => sum + Math.round(c.quantity * c.costMinor),
    0,
  );
}
export function invoiceState(
  invoice: { issued: boolean; dueAt: number; charges: Charge[] },
  paid: number,
  now: number,
) {
  if (!invoice.issued) return "Draft";
  if (paid >= total(invoice.charges)) return "Paid";
  if (invoice.dueAt < now) return "Overdue";
  return paid > 0 ? "Partially paid" : "Issued";
}
export function milestones(etd: number, eta: number, step = 0) {
  return STATUSES.map((name, i) => ({
    name,
    planned:
      i < 2
        ? etd - (2 - i) * DAY
        : i === 2
          ? etd
          : i === 3
            ? Math.round((etd + eta) / 2)
            : eta + (i - 4) * DAY,
    ...(i <= step
      ? {
          actual:
            i < 2
              ? etd - (2 - i) * DAY
              : i === 2
                ? etd
                : i === 3
                  ? Math.round((etd + eta) / 2)
                  : eta + (i - 4) * DAY,
        }
      : {}),
  }));
}
