import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.db
      .query("tasks")
      .withIndex("by_done_and_dueAt", (q) => q.eq("done", false))
      .take(20);
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    recordId: v.optional(v.id("records")),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    let recordName: string | undefined;
    if (args.recordId !== undefined) {
      const record = await ctx.db.get("records", args.recordId);
      recordName = record?.name;
    }
    return await ctx.db.insert("tasks", {
      title: args.title,
      recordId: args.recordId,
      recordName,
      assigneeName: user.name ?? user.email,
      team: user.team,
      dueAt: args.dueAt,
      done: false,
    });
  },
});

export const setDone = mutation({
  args: { id: v.id("tasks"), done: v.boolean() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const task = await ctx.db.get("tasks", args.id);
    if (task === null) {
      throw new ConvexError("Task not found.");
    }
    await ctx.db.patch("tasks", args.id, { done: args.done });
    return null;
  },
});
