import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser, requireAdmin } from "./lib/auth";
import { reference, activity } from "./shipping";
import { DAY } from "./shippingModel";
export function comparison(baseline: number, price: number) {
  if (
    !Number.isSafeInteger(baseline) ||
    baseline <= 0 ||
    !Number.isSafeInteger(price) ||
    price < 0
  )
    throw new ConvexError("Invalid comparison amounts.");
  return {
    savingMinor: baseline - price,
    percent: Math.round(((baseline - price) / baseline) * 1000) / 10,
  };
}
export function currentPrice(
  option: { freightMinor: number; handlingMinor: number; feeMinor: number },
  revision: number,
) {
  return (
    option.freightMinor +
    option.handlingMinor +
    option.feeMinor +
    ((revision - 1) % 3) * 2500
  );
}
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const u = await requireUser(ctx);
    const rows =
      u.role === "superadmin"
        ? await ctx.db.query("shippingScenarios").take(100)
        : u.customerId
          ? await ctx.db
              .query("shippingScenarios")
              .withIndex("by_customer", (q) =>
                q.eq("customerId", u.customerId!),
              )
              .take(100)
          : [];
    const sources = await ctx.db.query("shippingSources").take(100);
    const snapshots =
      u.role === "superadmin"
        ? await ctx.db.query("shippingComparisons").take(2000)
        : u.customerId
          ? await ctx.db
              .query("shippingComparisons")
              .withIndex("by_customer", (q) =>
                q.eq("customerId", u.customerId!),
              )
              .take(2000)
          : [];
    return {
      role: u.role,
      scenarios: rows.map((s) => {
        const source = sources.find((x) => x._id === s.sourceId)!;
        const baseline = s.baseline.reduce((n, l) => n + l.amountMinor, 0);
        return {
          id: s._id,
          key: s.key,
          title: s.title,
          description: s.description,
          origin: s.origin,
          destination: s.destination,
          cargo: s.cargo,
          currency: s.currency,
          baseline: s.baseline,
          baselineMinor: baseline,
          source: {
            name: source.name,
            revision: source.revision,
            observedAt: source.observedAt,
            validUntil: source.validUntil,
          },
          options: s.options.map((o) => {
            const price = currentPrice(o, source.revision);
            return {
              label: o.label,
              mode: o.mode,
              days: o.days,
              freightMinor: o.freightMinor + ((source.revision - 1) % 3) * 2500,
              handlingMinor: o.handlingMinor,
              feeMinor: o.feeMinor,
              priceMinor: price,
              ...comparison(baseline, price),
              ...(u.role === "superadmin"
                ? {
                    supplierMinor: o.supplierMinor,
                    marginMinor: price - o.supplierMinor,
                  }
                : {}),
            };
          }),
        };
      }),
      comparisons: snapshots
        .filter((s) => u.role !== "user" || s.requestedBy === u._id)
        .map((s) => ({
          id: s._id,
          enquiryId: s.enquiryId,
          baselineMinor: s.baselineMinor,
          priceMinor: s.priceMinor,
          savingMinor: s.savingMinor,
          currency: s.currency,
          createdAt: s.createdAt,
          sourceRevision: s.sourceRevision,
        })),
    };
  },
});
export const requestQuote = mutation({
  args: {
    scenarioId: v.id("shippingScenarios"),
    optionIndex: v.number(),
    sourceRevision: v.number(),
  },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx);
    const s = await ctx.db.get("shippingScenarios", a.scenarioId);
    if (!s || (u.role !== "superadmin" && u.customerId !== s.customerId))
      throw new ConvexError("Access denied.");
    const source = await ctx.db.get("shippingSources", s.sourceId);
    if (
      !source ||
      source.validUntil < Date.now() ||
      source.revision !== a.sourceRevision
    )
      throw new ConvexError(
        "Rates changed or expired. Review the refreshed comparison.",
      );
    if (!Number.isInteger(a.optionIndex) || !s.options[a.optionIndex])
      throw new ConvexError("Choose a valid option.");
    const existing = (
      await ctx.db
        .query("shippingComparisons")
        .withIndex("by_customer", (q) => q.eq("customerId", s.customerId))
        .take(2000)
    ).find(
      (c) =>
        c.scenarioId === s._id &&
        c.optionIndex === a.optionIndex &&
        c.sourceRevision === source.revision &&
        c.requestedBy === u._id,
    );
    if (existing) return existing.enquiryId;
    const o = s.options[a.optionIndex],
      price = currentPrice(o, source.revision),
      baseline = s.baseline.reduce((n, l) => n + l.amountMinor, 0),
      now = Date.now();
    const id = await ctx.db.insert("shippingEnquiries", {
      reference: await reference(ctx, "ENQ"),
      customerId: s.customerId,
      origin: s.origin,
      destination: s.destination,
      cargo: s.cargo,
      mode: o.mode,
      weightKg:
        s.key === "SAVE-CONSOLIDATE"
          ? 2400
          : s.key === "SAVE-READINESS"
            ? 1200
            : 1800,
      volumeM3:
        s.key === "SAVE-CONSOLIDATE"
          ? 18
          : s.key === "SAVE-READINESS"
            ? 10
            : 12,
      packages: 8,
      dimensions: "Demonstration cargo; confirm before quoting",
      containers: o.mode === "sea" ? "Shared container" : "",
      etd: now + 7 * DAY,
      eta: now + (7 + o.days) * DAY,
      incoterm: "FCA",
      currency: s.currency,
      validity: source.validUntil,
      charges: [
        {
          description: o.label,
          quantity: 1,
          unitMinor: price - o.feeMinor,
          costMinor: o.supplierMinor,
        },
        {
          description: "Platform service fee",
          quantity: 1,
          unitMinor: o.feeMinor,
          costMinor: 0,
        },
      ],
      stage: "New Enquiry",
      createdAt: now,
    });
    await ctx.db.insert("shippingAssignments", {
      customerId: s.customerId,
      userId: u._id,
      kind: "enquiry",
      entityId: id,
    });
    await ctx.db.insert("shippingComparisons", {
      customerId: s.customerId,
      scenarioId: s._id,
      optionIndex: a.optionIndex,
      enquiryId: id,
      baselineMinor: baseline,
      priceMinor: price,
      savingMinor: comparison(baseline, price).savingMinor,
      currency: s.currency,
      sourceRevision: source.revision,
      observedAt: source.observedAt,
      requestedBy: u._id,
      createdAt: now,
    });
    await activity(
      ctx,
      `Comparison ${s.key} submitted for quotation; illustrative assumptions saved`,
      s.customerId,
      undefined,
      true,
      u.name,
    );
    return id;
  },
});
export const sources = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const rows = await ctx.db.query("shippingSources").take(100);
    return Promise.all(
      rows.map(async (s) => ({
        ...s,
        events: await ctx.db
          .query("shippingSourceEvents")
          .withIndex("by_source", (q) => q.eq("sourceId", s._id))
          .order("desc")
          .take(3),
      })),
    );
  },
});
export const refresh = mutation({
  args: { id: v.id("shippingSources"), expectedRevision: v.number() },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const s = await ctx.db.get("shippingSources", a.id);
    if (!s) throw new ConvexError("Source not found.");
    if (s.revision !== a.expectedRevision) return s.revision;
    const now = Date.now();
    await ctx.db.patch("shippingSources", s._id, {
      observedAt: now,
      validUntil: now + 7 * DAY,
      revision: s.revision + 1,
    });
    await ctx.db.insert("shippingSourceEvents", {
      sourceId: s._id,
      happenedAt: now,
      revision: s.revision + 1,
      message:
        "Simulated fixture refresh. No external provider contacted. Accepted comparisons are unchanged.",
    });
    return s.revision + 1;
  },
});
