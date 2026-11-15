import { v, ConvexError } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";
import {
  action,
  query,
  mutation,
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./demoAccounts";
import { seedFeatures } from "./demoFixtures";
import { activity } from "./shipping";

export const accountByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) =>
    ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique(),
});
export const configure = internalMutation({
  args: {
    id: v.id("users"),
    role: v.union(
      v.literal("superadmin"),
      v.literal("admin"),
      v.literal("user"),
    ),
    company: v.string(),
  },
  handler: async (ctx, a) => {
    const c = a.company
      ? await ctx.db
          .query("shippingCompanies")
          .withIndex("by_name", (q) => q.eq("name", a.company))
          .unique()
      : null;
    if (a.company && !c) throw new ConvexError("Seed company missing.");
    await ctx.db.patch("users", a.id, {
      role: a.role,
      customerId: c?._id,
      disabled: false,
    });
  },
});
export const features = internalMutation({ args: {}, handler: seedFeatures });
export const initialize = internalAction({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.shippingSeed.initialize, {});
    for (const a of DEMO_ACCOUNTS) {
      const u = await ctx.runQuery(internal.platform.accountByEmail, {
        email: a.email,
      });
      if (!u) {
        const result = await createAccount<DataModel>(ctx, {
          provider: "password",
          account: { id: a.email, secret: DEMO_PASSWORD },
          profile: { email: a.email, name: a.name, role: a.role },
        });
        await ctx.runMutation(internal.platform.configure, {
          id: result.user._id,
          role: a.role,
          company: a.company,
        });
      } else if (!u.customerId && a.role !== "superadmin")
        await ctx.runMutation(internal.platform.configure, {
          id: u._id,
          role: a.role,
          company: a.company,
        });
    }
    await ctx.runMutation(internal.platform.features, {});
    return "Freight identities and sources initialized; existing edits preserved.";
  },
});
export const team = query({
  args: { customerId: v.optional(v.id("shippingCompanies")) },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx);
    if (u.role === "user") throw new ConvexError("Admin access required.");
    const companies =
      u.role === "superadmin"
        ? await ctx.db.query("shippingCompanies").take(2000)
        : [await ctx.db.get("shippingCompanies", u.customerId!)];
    const selected = u.role === "superadmin" ? a.customerId : u.customerId;
    const users = selected
      ? await ctx.db
          .query("users")
          .withIndex("by_customer", (q) => q.eq("customerId", selected))
          .take(500)
      : await ctx.db.query("users").take(500);
    const assignments = selected
      ? await ctx.db
          .query("shippingAssignments")
          .withIndex("by_customer", (q) => q.eq("customerId", selected))
          .take(2000)
      : [];
    const shipments = selected
      ? await ctx.db
          .query("shippingShipments")
          .withIndex("by_customerId", (q) => q.eq("customerId", selected))
          .take(2000)
      : [];
    const enquiries = selected
      ? await ctx.db
          .query("shippingEnquiries")
          .withIndex("by_customerId", (q) => q.eq("customerId", selected))
          .take(2000)
      : [];
    const quotes = selected
      ? await ctx.db
          .query("shippingQuotes")
          .withIndex("by_customerId", (q) => q.eq("customerId", selected))
          .take(2000)
      : [];
    return {
      role: u.role,
      selected,
      companies: companies
        .filter((c) => c !== null)
        .map((c) => ({ id: c._id, name: c.name })),
      users: users.map((x) => ({
        id: x._id,
        name: x.name,
        email: x.email,
        role: x.role,
        disabled: !!x.disabled,
        customerId: x.customerId,
      })),
      assignments,
      jobs: [
        ...shipments.map((s) => ({
          id: s._id,
          reference: s.reference,
          kind: "shipment" as const,
        })),
        ...enquiries.map((e) => ({
          id: e._id,
          reference: e.reference,
          kind: "enquiry" as const,
        })),
        ...quotes.map((q) => ({
          id: q._id,
          reference: q.reference,
          kind: "quote" as const,
        })),
      ],
    };
  },
});
export const authorizeProvision = internalQuery({
  args: {
    customerId: v.id("shippingCompanies"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx);
    if (
      u.role !== "superadmin" &&
      (u.role !== "admin" || u.customerId !== a.customerId || a.role !== "user")
    )
      throw new ConvexError("Access denied.");
    if (!(await ctx.db.get("shippingCompanies", a.customerId)))
      throw new ConvexError("Company not found.");
    return true;
  },
});
export const finishProvision = internalMutation({
  args: {
    id: v.id("users"),
    customerId: v.id("shippingCompanies"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx);
    if (
      u.role !== "superadmin" &&
      (u.role !== "admin" || u.customerId !== a.customerId || a.role !== "user")
    )
      throw new ConvexError("Access denied.");
    await ctx.db.patch("users", a.id, {
      customerId: a.customerId,
      role: a.role,
      disabled: false,
    });
    await activity(
      ctx,
      "Demo team member provisioned; no invitation email sent",
      a.customerId,
    );
  },
});
export const createUser = action({
  args: {
    name: v.string(),
    email: v.string(),
    customerId: v.id("shippingCompanies"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, a) => {
    await ctx.runQuery(internal.platform.authorizeProvision, {
      customerId: a.customerId,
      role: a.role,
    });
    const email = a.email.trim().toLowerCase();
    if (
      !/^[a-z0-9._+-]+@[a-z0-9.-]+\.example$/.test(email) ||
      !a.name.trim() ||
      a.name.length > 100
    )
      throw new ConvexError("Use a name and a fictional .example email.");
    if (await ctx.runQuery(internal.platform.accountByEmail, { email }))
      throw new ConvexError("Account already exists.");
    const result = await createAccount<DataModel>(ctx, {
      provider: "password",
      account: { id: email, secret: DEMO_PASSWORD },
      profile: { email, name: a.name, role: a.role, disabled: true },
    });
    await ctx.runMutation(internal.platform.finishProvision, {
      id: result.user._id,
      customerId: a.customerId,
      role: a.role,
    });
    return { email, password: DEMO_PASSWORD };
  },
});
export const setDisabled = mutation({
  args: { id: v.id("users"), disabled: v.boolean() },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx),
      target = await ctx.db.get("users", a.id);
    if (
      !target ||
      target._id === u._id ||
      target.role === "superadmin" ||
      (u.role !== "superadmin" &&
        (u.role !== "admin" ||
          target.customerId !== u.customerId ||
          target.role !== "user"))
    )
      throw new ConvexError("You cannot change this account.");
    if (a.disabled && target.role === "admin") {
      const peers = await ctx.db
        .query("users")
        .withIndex("by_customer", (q) => q.eq("customerId", target.customerId))
        .take(500);
      if (
        !peers.some(
          (p) => p._id !== target._id && p.role === "admin" && !p.disabled,
        )
      )
        throw new ConvexError("Keep one active client admin.");
    }
    await ctx.db.patch("users", a.id, { disabled: a.disabled });
    await activity(
      ctx,
      `Demo account ${a.disabled ? "disabled" : "enabled"}`,
      target.customerId,
    );
  },
});
export const assign = mutation({
  args: {
    userId: v.id("users"),
    kind: v.union(
      v.literal("shipment"),
      v.literal("enquiry"),
      v.literal("quote"),
    ),
    entityId: v.string(),
    assigned: v.boolean(),
  },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx),
      target = await ctx.db.get("users", a.userId);
    if (
      !target?.customerId ||
      target.role !== "user" ||
      target.disabled ||
      (u.role !== "superadmin" &&
        (u.role !== "admin" || u.customerId !== target.customerId))
    )
      throw new ConvexError("Access denied.");
    const table = (
      {
        shipment: "shippingShipments",
        enquiry: "shippingEnquiries",
        quote: "shippingQuotes",
      } as const
    )[a.kind];
    const id = ctx.db.normalizeId(table, a.entityId);
    const row = id ? await ctx.db.get(table, id) : null;
    if (!row || row.customerId !== target.customerId)
      throw new ConvexError("Job belongs to a different company.");
    const existing = (
      await ctx.db
        .query("shippingAssignments")
        .withIndex("by_user", (q) => q.eq("userId", a.userId))
        .take(2000)
    ).find((x) => x.entityId === a.entityId && x.kind === a.kind);
    if (a.assigned && !existing)
      await ctx.db.insert("shippingAssignments", {
        userId: a.userId,
        customerId: target.customerId,
        kind: a.kind,
        entityId: a.entityId,
      });
    if (!a.assigned && existing)
      await ctx.db.delete("shippingAssignments", existing._id);
    await activity(
      ctx,
      `Job ${row.reference} ${a.assigned ? "assigned to" : "unassigned from"} ${target.name}`,
      target.customerId,
    );
  },
});
