import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser, requireSuperadmin } from "./lib/auth";
import { DAY } from "./shippingModel";
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
    await requireSuperadmin(ctx);
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
        "Simulated fixture refresh. No external provider contacted. Shipment records and agreed pricing are unchanged.",
    });
    return s.revision + 1;
  },
});
