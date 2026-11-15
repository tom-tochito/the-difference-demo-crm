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
