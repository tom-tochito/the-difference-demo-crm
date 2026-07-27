import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fieldTypeValidator, systemMappingValidator } from "./schema";
import { requireAdmin, requireUser } from "./lib/auth";

export const listTypes = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.db.query("entityTypes").take(50);
  },
});

export const listFields = query({
  args: { entityTypeKey: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("fieldDefs")
      .withIndex("by_entityTypeKey_and_order", (q) =>
        q.eq("entityTypeKey", args.entityTypeKey),
      )
      .take(200);
  },
});

const fieldDefFields = {
  entityTypeKey: v.string(),
  key: v.string(),
  label: v.string(),
  type: fieldTypeValidator,
  options: v.optional(v.array(v.string())),
  relationTo: v.optional(v.string()),
  required: v.boolean(),
  searchable: v.boolean(),
  showInList: v.boolean(),
  group: v.optional(v.string()),
  systemMapping: v.optional(systemMappingValidator),
};

export const createField = mutation({
  args: fieldDefFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(args.key)) {
      throw new ConvexError(
        "Field key must start with a letter and contain only letters, numbers, and underscores.",
      );
    }
    const existing = await ctx.db
      .query("fieldDefs")
      .withIndex("by_entityTypeKey_and_key", (q) =>
        q.eq("entityTypeKey", args.entityTypeKey).eq("key", args.key),
      )
      .unique();
    if (existing !== null) {
      throw new ConvexError(`A field with key "${args.key}" already exists.`);
    }
    const siblings = await ctx.db
      .query("fieldDefs")
      .withIndex("by_entityTypeKey_and_order", (q) =>
        q.eq("entityTypeKey", args.entityTypeKey),
      )
      .order("desc")
      .take(1);
    const order = siblings.length > 0 ? siblings[0].order + 1 : 0;
    return await ctx.db.insert("fieldDefs", { ...args, order });
  },
});

export const updateField = mutation({
  args: {
    id: v.id("fieldDefs"),
    label: v.optional(v.string()),
    type: v.optional(fieldTypeValidator),
    options: v.optional(v.array(v.string())),
    relationTo: v.optional(v.string()),
    required: v.optional(v.boolean()),
    searchable: v.optional(v.boolean()),
    showInList: v.optional(v.boolean()),
    group: v.optional(v.string()),
    systemMapping: v.optional(systemMappingValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    const def = await ctx.db.get("fieldDefs", id);
    if (def === null) {
      throw new ConvexError("Field not found.");
    }
    const patch = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );
    await ctx.db.patch("fieldDefs", id, patch);
    return null;
  },
});

export const deleteField = mutation({
  args: { id: v.id("fieldDefs") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const def = await ctx.db.get("fieldDefs", args.id);
    if (def === null) {
      throw new ConvexError("Field not found.");
    }
    if (def.systemMapping === "name") {
      throw new ConvexError("The name field cannot be deleted.");
    }
    // Existing record payloads keep the orphaned key; it is simply no
    // longer rendered or written. This is intentional for the demo.
    await ctx.db.delete("fieldDefs", args.id);
    return null;
  },
});

export const reorderFields = mutation({
  args: {
    entityTypeKey: v.string(),
    orderedIds: v.array(v.id("fieldDefs")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (let i = 0; i < args.orderedIds.length; i++) {
      const def = await ctx.db.get("fieldDefs", args.orderedIds[i]);
      if (def === null || def.entityTypeKey !== args.entityTypeKey) {
        throw new ConvexError("Invalid field list.");
      }
      await ctx.db.patch("fieldDefs", args.orderedIds[i], { order: i });
    }
    return null;
  },
});
