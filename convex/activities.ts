import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const listByRecord = query({
  args: { recordId: v.id("records") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("activities")
      .withIndex("by_recordId_and_happenedAt", (q) =>
        q.eq("recordId", args.recordId),
      )
      .order("desc")
      .take(50);
  },
});

export const log = mutation({
  args: {
    recordId: v.id("records"),
    kind: v.string(),
    body: v.string(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.insert("activities", {
      recordId: args.recordId,
      kind: args.kind,
      body: args.body,
      detail: args.detail,
      team: user.team,
      userId: user._id,
      happenedAt: Date.now(),
    });
    return null;
  },
});
