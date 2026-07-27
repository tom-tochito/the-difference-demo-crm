import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/auth";
import { buildRecordPatch } from "./lib/records";

export const list = query({
  args: {
    entityTypeKey: v.string(),
    paginationOpts: paginationOptsValidator,
    stage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    if (args.stage !== undefined) {
      const stage = args.stage;
      return await ctx.db
        .query("records")
        .withIndex("by_entityTypeKey_and_stage", (q) =>
          q.eq("entityTypeKey", args.entityTypeKey).eq("stage", stage),
        )
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("records")
      .withIndex("by_entityTypeKey", (q) =>
        q.eq("entityTypeKey", args.entityTypeKey),
      )
      .paginate(args.paginationOpts);
  },
});

export const search = query({
  args: {
    entityTypeKey: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("records")
      .withSearchIndex("search_text", (q) =>
        q
          .search("searchText", args.query.toLowerCase())
          .eq("entityTypeKey", args.entityTypeKey),
      )
      .take(50);
  },
});

export const get = query({
  args: { id: v.id("records") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const record = await ctx.db.get("records", args.id);
    if (record === null) {
      return null;
    }
    const parent =
      record.parentId !== undefined
        ? await ctx.db.get("records", record.parentId)
        : null;
    // Resolve relation field values to names for display.
    const relationNames: Record<string, string> = {};
    for (const [key, value] of Object.entries(record.fields)) {
      if (typeof value === "string") {
        const id = ctx.db.normalizeId("records", value);
        if (id !== null) {
          const target = await ctx.db.get("records", id);
          if (target !== null) {
            relationNames[key] = target.name;
          }
        }
      }
    }
    return {
      ...record,
      parentName: parent?.name ?? null,
      parentEntityTypeKey: parent?.entityTypeKey ?? null,
      relationNames,
    };
  },
});

export const listChildren = query({
  args: {
    parentId: v.id("records"),
    entityTypeKey: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("records")
      .withIndex("by_entityTypeKey_and_parentId", (q) =>
        q.eq("entityTypeKey", args.entityTypeKey).eq("parentId", args.parentId),
      )
      .take(100);
  },
});

export const create = mutation({
  args: {
    entityTypeKey: v.string(),
    fields: v.record(v.string(), v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const entityType = await ctx.db
      .query("entityTypes")
      .withIndex("by_key", (q) => q.eq("key", args.entityTypeKey))
      .unique();
    if (entityType === null) {
      throw new ConvexError(`Unknown entity type "${args.entityTypeKey}".`);
    }
    const defs = await ctx.db
      .query("fieldDefs")
      .withIndex("by_entityTypeKey_and_order", (q) =>
        q.eq("entityTypeKey", args.entityTypeKey),
      )
      .take(200);
    const patch = await buildRecordPatch(ctx, defs, args.fields);
    const id = await ctx.db.insert("records", {
      entityTypeKey: args.entityTypeKey,
      createdBy: user._id,
      ...patch,
    });
    await ctx.db.insert("activities", {
      recordId: id,
      kind: "system",
      body: `${entityType.label} created by ${user.name ?? user.email}`,
      team: user.team,
      userId: user._id,
      happenedAt: Date.now(),
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("records"),
    fields: v.record(v.string(), v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const record = await ctx.db.get("records", args.id);
    if (record === null) {
      throw new ConvexError("Record not found.");
    }
    const defs = await ctx.db
      .query("fieldDefs")
      .withIndex("by_entityTypeKey_and_order", (q) =>
        q.eq("entityTypeKey", record.entityTypeKey),
      )
      .take(200);
    const patch = await buildRecordPatch(ctx, defs, args.fields);
    await ctx.db.patch("records", args.id, patch);
    await ctx.db.insert("activities", {
      recordId: args.id,
      kind: "system",
      body: `Record updated by ${user.name ?? user.email}`,
      team: user.team,
      userId: user._id,
      happenedAt: Date.now(),
    });
    return null;
  },
});

export const setFlags = mutation({
  args: {
    id: v.id("records"),
    flagged: v.optional(v.boolean()),
    restricted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const record = await ctx.db.get("records", args.id);
    if (record === null) {
      throw new ConvexError("Record not found.");
    }
    const patch: { flagged?: boolean; restricted?: boolean } = {};
    if (args.flagged !== undefined) patch.flagged = args.flagged;
    if (args.restricted !== undefined) patch.restricted = args.restricted;
    await ctx.db.patch("records", args.id, patch);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("records") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db.get("records", args.id);
    if (record === null) {
      throw new ConvexError("Record not found.");
    }
    // Clean up this record's activity log (bounded, demo scale).
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_recordId_and_happenedAt", (q) => q.eq("recordId", args.id))
      .take(500);
    for (const activity of activities) {
      await ctx.db.delete("activities", activity._id);
    }
    await ctx.db.delete("records", args.id);
    return null;
  },
});
