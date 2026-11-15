import type { MutationCtx } from "./_generated/server";
import { DAY } from "./shippingModel";
export async function seedFeatures(ctx: MutationCtx) {
  const now = Date.now();
  if (
    !(await ctx.db
      .query("platformMigrations")
      .withIndex("by_key", (q) => q.eq("key", "actual-milestones-v2"))
      .unique())
  ) {
    const shipments = await ctx.db.query("shippingShipments").take(2001);
    if (shipments.length > 2000)
      throw new Error("Milestone migration exceeds demo capacity.");
    let repaired = 0;
    for (const s of shipments) {
      if (!s.milestones.some((m) => m.actual !== undefined && m.actual > now))
        continue;
      let nextActual = now;
      const corrected = [...s.milestones];
      for (let i = corrected.length - 1; i >= 0; i--) {
        const m = corrected[i];
        if (m.actual !== undefined) {
          nextActual = Math.min(m.actual, nextActual, now);
          corrected[i] = { ...m, actual: nextActual };
        }
      }
      await ctx.db.patch("shippingShipments", s._id, { milestones: corrected });
      repaired++;
    }
    await ctx.db.insert("platformMigrations", {
      key: "actual-milestones-v2",
      completedAt: now,
      detail: `Corrected future actual milestones on ${repaired} shipments; planned dates preserved.`,
    });
  }
  const sourceSpecs = [
    [
      "rates",
      "Carrier rate desk",
      "Rates",
      "Asia–Europe ocean and air",
      "Fictional contracted buy rates; fixture set FO-2026",
    ],
    [
      "schedules",
      "Sailing & flight schedules",
      "Schedules",
      "Weekly services; sea, air and road",
      "Synthetic timetable observations",
    ],
    [
      "tracking",
      "Movement signals",
      "Milestones",
      "Departure, arrival and delivery events",
      "Seeded shipment milestones; no carrier feed",
    ],
    [
      "ports",
      "Port & document signals",
      "Exceptions",
      "Dwell time and document readiness",
      "Illustrative port conditions and checklist rules",
    ],
    [
      "history",
      "Importer cost history",
      "Benchmarks",
      "Comparable shipments in GBP, EUR and USD",
      "Fictional baseline logistics costs; not market benchmarks",
    ],
  ];
  for (const [key, name, category, coverage, provenance] of sourceSpecs)
    if (
      !(await ctx.db
        .query("shippingSources")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique())
    )
      await ctx.db.insert("shippingSources", {
        key,
        name,
        category,
        coverage,
        provenance,
        observedAt: now,
        validUntil: now + 7 * DAY,
        revision: 1,
      });
  const source = await ctx.db
    .query("shippingSources")
    .withIndex("by_key", (q) => q.eq("key", "rates"))
    .unique();
  const companies = await ctx.db.query("shippingCompanies").take(2000);
  const specs = [
    {
      key: "SAVE-CONSOLIDATE",
      company: "Alder & Finch Exports",
      title: "One consolidated movement. Less wasted capacity.",
      description:
        "Combine two compatible purchase orders into one ocean shipment. Allow an extra three days for consolidation.",
      origin: "Ningbo, CN",
      destination: "Felixstowe, GB",
      cargo: "Homeware components · 18 m³ · 2,400 kg",
      currency: "GBP" as const,
      baseline: [
        { label: "Separate ocean movements", amountMinor: 480000 },
        { label: "Handling & documentation", amountMinor: 120000 },
      ],
      options: [
        {
          label: "Consolidated ocean",
          mode: "sea" as const,
          days: 38,
          freightMinor: 330000,
          handlingMinor: 65000,
          feeMinor: 25000,
          supplierMinor: 350000,
        },
        {
          label: "Direct ocean",
          mode: "sea" as const,
          days: 35,
          freightMinor: 420000,
          handlingMinor: 75000,
          feeMinor: 25000,
          supplierMinor: 445000,
        },
        {
          label: "Priority air",
          mode: "air" as const,
          days: 6,
          freightMinor: 820000,
          handlingMinor: 55000,
          feeMinor: 30000,
          supplierMinor: 800000,
        },
      ],
    },
    {
      key: "SAVE-SERVICE",
      company: "Northstar Ceramics",
      title: "The right service, not simply the fastest.",
      description:
        "Non-urgent replenishment can move by ocean instead of air. Compare cost against a 40-day delivery window.",
      origin: "Shenzhen, CN",
      destination: "Hamburg, DE",
      cargo: "Ceramic tableware · 12 m³ · 1,800 kg",
      currency: "EUR" as const,
      baseline: [
        { label: "Air freight", amountMinor: 780000 },
        { label: "Handling & documents", amountMinor: 90000 },
      ],
      options: [
        {
          label: "Planned ocean",
          mode: "sea" as const,
          days: 36,
          freightMinor: 285000,
          handlingMinor: 80000,
          feeMinor: 30000,
          supplierMinor: 330000,
        },
        {
          label: "Priority air",
          mode: "air" as const,
          days: 7,
          freightMinor: 680000,
          handlingMinor: 65000,
          feeMinor: 30000,
          supplierMinor: 660000,
        },
      ],
    },
    {
      key: "SAVE-READINESS",
      company: "Alder & Finch Exports",
      title: "Clear documents. Fewer avoidable charges.",
      description:
        "Prepare documents before arrival and arrange collection inside the free-time window. Avoidance is an estimate, not a guarantee.",
      origin: "Istanbul, TR",
      destination: "Birmingham, GB",
      cargo: "Textile samples · 8 pallets · 1,200 kg",
      currency: "GBP" as const,
      baseline: [
        { label: "Road transport", amountMinor: 220000 },
        { label: "Handling", amountMinor: 40000 },
        { label: "Illustrative avoidable storage", amountMinor: 60000 },
      ],
      options: [
        {
          label: "Managed arrival",
          mode: "road" as const,
          days: 8,
          freightMinor: 210000,
          handlingMinor: 35000,
          feeMinor: 20000,
          supplierMinor: 230000,
        },
        {
          label: "Standard collection",
          mode: "road" as const,
          days: 10,
          freightMinor: 220000,
          handlingMinor: 65000,
          feeMinor: 15000,
          supplierMinor: 260000,
        },
      ],
    },
  ];
  for (const spec of specs) {
    if (
      await ctx.db
        .query("shippingScenarios")
        .withIndex("by_key", (q) => q.eq("key", spec.key))
        .unique()
    )
      continue;
    const c = companies.find((c) => c.name === spec.company);
    if (!c) continue;
    const { company, ...data } = spec;
    void company;
    await ctx.db.insert("shippingScenarios", {
      ...data,
      customerId: c._id,
      sourceId: source!._id,
    });
  }
  if (
    await ctx.db
      .query("platformMigrations")
      .withIndex("by_key", (q) => q.eq("key", "initial-assignments-v2"))
      .unique()
  )
    return;
  const users = await ctx.db.query("users").take(500);
  for (const u of users.filter(
    (u) => u.role === "user" && u.customerId && !u.disabled,
  )) {
    if (
      await ctx.db
        .query("shippingAssignments")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .first()
    )
      continue;
    const rows = await ctx.db
      .query("shippingShipments")
      .withIndex("by_customerId", (q) => q.eq("customerId", u.customerId!))
      .take(2000);
    const peers = users
      .filter((x) => x.customerId === u.customerId && x.role === "user")
      .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    const index = peers.findIndex((x) => x._id === u._id);
    for (let i = 0; i < rows.length; i++)
      if (i % peers.length === index)
        await ctx.db.insert("shippingAssignments", {
          customerId: u.customerId!,
          userId: u._id,
          kind: "shipment",
          entityId: rows[i]._id,
        });
  }
  await ctx.db.insert("platformMigrations", {
    key: "initial-assignments-v2",
    completedAt: now,
    detail:
      "Initial assignments provisioned once; subsequent deployments preserve edits.",
  });
}
