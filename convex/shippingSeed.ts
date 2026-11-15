import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { seedFeatures } from "./demoFixtures";
import { requireAdmin } from "./lib/auth";
import {
  DAY,
  STAGES,
  STATUSES,
  defaultRequirements,
  milestones,
  total,
} from "./shippingModel";

const companies = [
  "Alder & Finch Exports",
  "Northstar Ceramics",
  "Meridian Components",
  "Juniper Medical",
  "Atlas Homewares",
  "Cedar Textile Co",
  "Harbour Coffee Traders",
  "Boreal Instruments",
  "Saffron Foods",
  "Solstice Energy",
  "Pacific Orchard",
  "Linden Engineering",
  "Bluewater Freight",
  "Orion Air Logistics",
  "Continental Roadlink",
  "Seabrook Shipping Agency",
];
const lanes = [
  ["Southampton, GB", "New York, US", "sea"],
  ["Felixstowe, GB", "Singapore, SG", "sea"],
  ["Heathrow, GB", "Dubai, AE", "air"],
  ["Manchester, GB", "Amsterdam, NL", "road"],
  ["Hamburg, DE", "Toronto, CA", "sea"],
  ["Paris CDG, FR", "Chicago, US", "air"],
] as const;
const cargo = [
  "Precision machine components",
  "Glazed ceramic tableware",
  "Medical diagnostic instruments",
  "Organic woven textiles",
  "Flat-packed oak furniture",
  "Solar inverter assemblies",
];

export async function seedShipping(ctx: MutationCtx, now: number) {
  const existing = await ctx.db
    .query("shippingSettings")
    .withIndex("by_key", (q) => q.eq("key", "demo"))
    .unique();
  if (existing) return "Shipping demo already initialized; edits preserved.";
  await ctx.db.insert("shippingSettings", {
    key: "demo",
    seedVersion: 1,
    seededAt: now,
    nextSequence: 1001,
    requirements: {
      sea: [...defaultRequirements.sea],
      air: [...defaultRequirements.air],
      road: [...defaultRequirements.road],
    },
  });
  const ids: Id<"shippingCompanies">[] = [];
  for (let i = 0; i < companies.length; i++) {
    const id = await ctx.db.insert("shippingCompanies", {
      name: companies[i],
      role:
        i < 10
          ? "Exporter"
          : i < 12
            ? "Consignee"
            : i < 15
              ? "Freight partner"
              : "Shipping agent",
      country:
        i % 3 === 0
          ? "United Kingdom"
          : i % 3 === 1
            ? "Germany"
            : "United States",
      address: `${12 + i} Commerce Way, Business District`,
      owner: i % 2 ? "Sofia Chen" : "James Morgan",
      tradeLanes: `${lanes[i % 6][0]} → ${lanes[i % 6][1]}`,
      preferredMode: lanes[i % 6][2],
      paymentDays: i % 2 ? 30 : 14,
    });
    ids.push(id);
    await ctx.db.insert("shippingContacts", {
      customerId: id,
      name: ["Alex Reed", "Maya Patel", "Daniel Brooks", "Sophie Weber"][i % 4],
      email: `logistics@company${i + 1}.example`,
      phone: `+44 20 7946 ${String(i).padStart(4, "0")}`,
      title: "Export coordinator",
    });
  }
  const quoteIds: Id<"shippingQuotes">[] = [];
  const bookingIds: Id<"shippingBookings">[] = [];
  for (let i = 0; i < 26; i++) {
    const lane = lanes[i % 6];
    const data = {
      customerId: ids[i % 12],
      origin: lane[0],
      destination: lane[1],
      mode: lane[2],
      cargo: cargo[i % 6],
      weightKg: 1200 + i * 135,
      volumeM3: 4 + i * 0.8,
      packages: 10 + i,
      dimensions: "120 × 100 × 140 cm per pallet",
      containers: lane[2] === "sea" ? "1 × 40ft HC" : "",
      etd: now + (3 + i) * DAY,
      eta: now + (lane[2] === "sea" ? 28 + i : 6 + i) * DAY,
      incoterm: "FCA",
      currency: (["GBP", "EUR", "USD"] as const)[i % 3],
      validity: now + 14 * DAY,
      charges: [
        {
          description: "Demo freight",
          quantity: 1,
          unitMinor: 180000 + i * 7000,
          costMinor: 130000 + i * 4000,
        },
        {
          description: "Collection & handling",
          quantity: 1,
          unitMinor: 24000,
          costMinor: 16000,
        },
        {
          description: "Documentation",
          quantity: 1,
          unitMinor: 6500,
          costMinor: 2500,
        },
      ],
      createdAt: now - (26 - i) * DAY,
    };
    const stage = i < 10 ? "Won" : STAGES[(i - 10) % STAGES.length];
    const enquiryId = await ctx.db.insert("shippingEnquiries", {
      ...data,
      reference: `ENQ-${String(i + 1).padStart(5, "0")}`,
      stage,
    });
    const quoteId = await ctx.db.insert("shippingQuotes", {
      ...data,
      reference: `QUO-${String(i + 1).padStart(5, "0")}`,
      enquiryId,
      stage,
    });
    quoteIds.push(quoteId);
    if (stage === "Won")
      bookingIds.push(
        await ctx.db.insert("shippingBookings", {
          ...data,
          reference: `BKG-${String(i + 1).padStart(5, "0")}`,
          quoteId,
          confirmed: true,
        }),
      );
  }
  // Unquoted enquiry for the opening walkthrough.
  const first = await ctx.db.get("shippingQuotes", quoteIds[10]);
  if (first) {
    const { _id, _creationTime, enquiryId, ...data } = first;
    void _id;
    void _creationTime;
    void enquiryId;
    await ctx.db.insert("shippingEnquiries", {
      ...data,
      customerId: ids[0],
      reference: "ENQ-DEMO-START",
      stage: "New Enquiry",
      cargo: "Precision components for New York distributor",
      origin: "Southampton, GB",
      destination: "New York, US",
      mode: "sea",
    });
  }
  for (let i = 0; i < 40; i++) {
    const lane = lanes[i % 6];
    const mode = i === 0 ? "sea" : i === 2 ? "air" : lane[2];
    const step = i === 0 || i === 1 ? 1 : i === 2 ? 3 : i === 3 ? 5 : i % 6;
    const eta =
      step === 5
        ? now - (3 + i * 4) * DAY
        : step === 4
          ? now - DAY
          : now +
            (mode === "sea"
              ? 6 + (i % 9)
              : mode === "air"
                ? 1 + (i % 3)
                : 4 + (i % 4)) *
              DAY;
    const etd =
      i === 1
        ? now - DAY
        : step < 2
          ? now + (1 + (i % 2)) * DAY
          : step >= 4
            ? eta - (mode === "sea" ? 24 : mode === "air" ? 3 : 5) * DAY
            : now -
              (mode === "sea" ? 12 + (i % 9) : mode === "air" ? 2 : 3) * DAY;
    const b =
      i < bookingIds.length
        ? await ctx.db.get("shippingBookings", bookingIds[i])
        : null;
    const charges = b?.charges ?? [
      {
        description: "Demo freight",
        quantity: 1,
        unitMinor: 240000 + i * 5000,
        costMinor: 175000 + i * 3000,
      },
      {
        description: "Handling & documentation",
        quantity: 1,
        unitMinor: 30000,
        costMinor: 18000,
      },
    ];
    const cid = b?.customerId ?? ids[i % 12];
    const reference =
      [
        "SHP-OCEAN-APPROVAL",
        "SHP-DELAY-FOLLOWUP",
        "SHP-AIR-ARRIVAL",
        "SHP-DELIVERED-DUE",
      ][i] ?? `SHP-${String(i + 1).padStart(5, "0")}`;
    const route = {
      customerId: cid,
      origin: i === 2 ? "Heathrow, GB" : lane[0],
      destination: i === 2 ? "Dubai, AE" : lane[1],
      mode,
      cargo: cargo[i % 6],
      weightKg: 850 + i * 130,
      volumeM3: 3.2 + i,
      packages: 8 + i,
      dimensions: "120 × 100 × 140 cm per pallet",
      containers: mode === "sea" ? `DEMO${String(1000000 + i)} · 40ft HC` : "",
      etd,
      eta,
      incoterm: "FCA",
      currency: b?.currency ?? (["GBP", "EUR", "USD"] as const)[i % 3],
    };
    // Keep seed conversion lineage consistent with each shipment's transport plan.
    if (b) {
      await ctx.db.patch("shippingBookings", b._id, {
        ...route,
        createdAt: etd - 7 * DAY,
      });
      if (b.quoteId) {
        await ctx.db.patch("shippingQuotes", b.quoteId, {
          ...route,
          createdAt: etd - 10 * DAY,
        });
        const q = await ctx.db.get("shippingQuotes", b.quoteId);
        if (q?.enquiryId)
          await ctx.db.patch("shippingEnquiries", q.enquiryId, {
            ...route,
            createdAt: etd - 12 * DAY,
          });
      }
    }
    const ms = milestones(etd, eta, step).map((m, index) => ({
      ...m,
      ...(m.actual !== undefined
        ? { actual: Math.min(m.actual, now - (step - index) * 3600000) }
        : {}),
    }));
    if (step === 5 && i % 2 === 0) ms[5].actual = ms[5].planned + DAY;
    const sid = await ctx.db.insert("shippingShipments", {
      ...route,
      reference,
      bookingId: b?._id,
      carrier:
        mode === "sea"
          ? "Bluewater Ocean (demo)"
          : mode === "air"
            ? "Orion Air (demo)"
            : "Continental Roadlink (demo)",
      service: mode === "sea" ? "FCL scheduled" : "Priority export",
      operator: i % 2 ? "Sofia Chen" : "James Morgan",
      shipper: companies[ids.indexOf(cid)],
      consignee: companies[10 + (i % 2)],
      notifyParty: "Same as consignee",
      transportRef: `${mode === "sea" ? "BL" : mode === "air" ? "AWB" : "CMR"}-DEMO-${1000 + i}`,
      transportName:
        mode === "sea"
          ? "MV Horizon / V026"
          : mode === "air"
            ? "OA204"
            : "EU trailer 24",
      seal: mode === "sea" ? `DEMO-SEAL-${i + 1}` : "",
      stops: mode === "sea" && i % 2 ? "Rotterdam, NL" : "",
      status: STATUSES[step],
      milestones: ms,
      charges,
      createdAt: Math.min(now - (45 + i) * DAY, etd - 6 * DAY),
      updatedAt: now - i * 3600000,
    });
    for (const type of defaultRequirements[mode])
      await ctx.db.insert("shippingDocuments", {
        shipmentId: sid,
        type,
        status:
          i === 0 && type === "Bill of lading"
            ? "Awaiting approval"
            : step < 2 && type === "Packing list"
              ? "Missing"
              : "Approved",
        owner: "Sofia Chen",
        shared: step >= 3,
        updatedAt: now - DAY,
      });
    await ctx.db.insert("shippingActivities", {
      customerId: cid,
      shipmentId: sid,
      body: `Shipment ${reference}: ${STATUSES[step]}`,
      public: true,
      author: "Demo tracking",
      happenedAt: now - i * 3600000,
    });
    await ctx.db.insert("shippingActivities", {
      customerId: cid,
      shipmentId: sid,
      body: "Internal: verify handling allocation with operations before final billing.",
      public: false,
      author: "James Morgan",
      happenedAt: now - DAY,
    });
    if (i % 4 === 0 || i < 4)
      await ctx.db.insert("shippingTasks", {
        customerId: cid,
        shipmentId: sid,
        title: [
          "Approve draft bill of lading",
          "Follow up delayed departure",
          "Confirm arrival handover",
          "Follow up outstanding payment",
        ][i % 4],
        assignee: i % 2 ? "Sofia Chen" : "James Morgan",
        priority: i < 4 ? "High" : "Normal",
        dueAt: now + ((i % 3) - 1) * DAY,
        done: false,
        resolution: "",
      });
    if (i === 1 || i === 13 || i === 25)
      await ctx.db.insert("shippingExceptions", {
        shipmentId: sid,
        title: "Departure delayed — revised connection pending",
        resolved: false,
        resolution: "",
        createdAt: now - DAY,
      });
    if (step >= 3) {
      const iid = await ctx.db.insert("shippingInvoices", {
        customerId: cid,
        shipmentId: sid,
        reference: `INV-${String(i + 1).padStart(5, "0")}`,
        currency: route.currency,
        charges,
        issued: i % 7 !== 0,
        dueAt: i === 3 ? now - 7 * DAY : now + ((i % 3) - 1) * 10 * DAY,
        issuedAt: i % 7 !== 0 ? now - (15 + i) * DAY : undefined,
      });
      if (i !== 3 && i % 7 !== 0 && i % 2 === 0)
        await ctx.db.insert("shippingPayments", {
          invoiceId: iid,
          amountMinor:
            i % 4 === 0 ? total(charges) : Math.round(total(charges) / 2),
          receivedAt: now - DAY,
          reference: "Seeded demo bank receipt",
          requestId: `seed-${i}`,
        });
    }
  }
  return "Initialized 16 companies, 26 quotations and 40 shipments.";
}
export const initialize = internalMutation({
  args: {},
  handler: async (ctx) => await seedShipping(ctx, Date.now()),
});
export const reset = mutation({
  args: { confirmation: v.string() },
  handler: async (ctx, { confirmation }) => {
    await requireAdmin(ctx);
    if (confirmation !== "RESET SHIPPING")
      throw new ConvexError("Type RESET SHIPPING to confirm.");
    const previousCompanies = await ctx.db
      .query("shippingCompanies")
      .take(2000);
    const previousUsers = await ctx.db.query("users").take(500);
    const tables = [
      "shippingUploadGrants",
      "shippingAssignments",
      "shippingComparisons",
      "shippingScenarios",
      "shippingSourceEvents",
      "shippingSources",
      "shippingPayments",
      "shippingInvoices",
      "shippingActivities",
      "shippingExceptions",
      "shippingTasks",
      "shippingDocuments",
      "shippingShipments",
      "shippingBookings",
      "shippingQuotes",
      "shippingEnquiries",
      "shippingContacts",
      "shippingCompanies",
      "shippingSettings",
    ] as const;
    // Atomic demo reset: refuse oversized resets rather than partially deleting a workspace.
    const groups = await Promise.all(
      tables.map((table) => ctx.db.query(table).take(1501)),
    );
    if (groups.reduce((sum, rows) => sum + rows.length, 0) > 1500)
      throw new ConvexError(
        "This workspace exceeds the safe demo reset size. Ask an administrator to archive records first.",
      );
    const docs = await ctx.db.query("shippingDocuments").take(1501);
    for (const d of docs)
      if (d.storageId) await ctx.storage.delete(d.storageId);
    for (let i = 0; i < tables.length; i++)
      for (const row of groups[i]) await ctx.db.delete(tables[i], row._id);
    await seedShipping(ctx, Date.now());
    const nextCompanies = await ctx.db.query("shippingCompanies").take(2000);
    for (const u of previousUsers)
      if (u.customerId) {
        const name = previousCompanies.find(
          (c) => c._id === u.customerId,
        )?.name;
        let next = nextCompanies.find((c) => c.name === name);
        if (!next) {
          const previous = previousCompanies.find(
            (c) => c._id === u.customerId,
          );
          if (previous) {
            const { _id, _creationTime, ...fields } = previous;
            void _id;
            void _creationTime;
            const id = await ctx.db.insert("shippingCompanies", fields);
            next = (await ctx.db.get("shippingCompanies", id))!;
            nextCompanies.push(next);
          }
        }
        await ctx.db.patch("users", u._id, { customerId: next?._id });
      }
    const assignmentsMarker = await ctx.db
      .query("platformMigrations")
      .withIndex("by_key", (q) => q.eq("key", "initial-assignments-v2"))
      .unique();
    if (assignmentsMarker)
      await ctx.db.delete("platformMigrations", assignmentsMarker._id);
    await seedFeatures(ctx);
    return "Freight demo reset; accounts retained.";
  },
});
