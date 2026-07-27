import { v } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { Id } from "./_generated/dataModel";
import { buildRecordPatch } from "./lib/records";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_PASSWORD,
  DEMO_USER_EMAIL,
  ENTITY_TYPES,
  FIELD_DEFS,
  TARGET_SEEDS,
  activitySeeds,
  contactSeeds,
  deadlineSeeds,
  giftSeeds,
  organisationSeeds,
  pipelineSeeds,
  taskSeeds,
} from "./seedData";

export const userByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
  },
});

/** Entry point: `npx convex run seed:seedAll` */
export const seedAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const accounts: Array<{
      email: string;
      name: string;
      role: "admin" | "user";
      team: string;
    }> = [
      { email: DEMO_ADMIN_EMAIL, name: "Demo Admin", role: "admin", team: "Fundraising" },
      { email: DEMO_USER_EMAIL, name: "Demo User", role: "user", team: "DSP" },
    ];

    let adminUserId: Id<"users"> | null = null;
    for (const account of accounts) {
      const existing = await ctx.runQuery(internal.seed.userByEmail, {
        email: account.email,
      });
      let userId = existing?._id ?? null;
      if (userId === null) {
        const created = await createAccount<DataModel>(ctx, {
          provider: "password",
          account: { id: account.email, secret: DEMO_PASSWORD },
          profile: {
            email: account.email,
            name: account.name,
            role: account.role,
            team: account.team,
          },
        });
        userId = created.user._id;
      }
      if (account.role === "admin") {
        adminUserId = userId;
      }
    }
    if (adminUserId === null) {
      throw new Error("Admin account missing after seeding.");
    }

    await ctx.runMutation(internal.seed.seedData, {
      adminUserId,
      now: Date.now(),
    });
    return "Seeded demo accounts and data.";
  },
});

export const seedData = internalMutation({
  args: { adminUserId: v.id("users"), now: v.number() },
  handler: async (ctx, args) => {
    // Wipe domain tables (bounded batches; demo scale fits one transaction).
    for (const table of [
      "records",
      "activities",
      "tasks",
      "targets",
      "fieldDefs",
      "entityTypes",
    ] as const) {
      let rows = await ctx.db.query(table).take(500);
      while (rows.length > 0) {
        for (const row of rows) {
          await ctx.db.delete(table, row._id);
        }
        rows = await ctx.db.query(table).take(500);
      }
    }

    for (const entityType of ENTITY_TYPES) {
      await ctx.db.insert("entityTypes", { ...entityType, isSystem: true });
    }
    for (const [entityTypeKey, fields] of Object.entries(FIELD_DEFS)) {
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        await ctx.db.insert("fieldDefs", {
          entityTypeKey,
          key: f.key,
          label: f.label,
          type: f.type,
          options: f.options,
          relationTo: f.relationTo,
          required: f.required ?? false,
          searchable: f.searchable ?? false,
          showInList: f.showInList ?? false,
          group: f.group,
          order: i,
          systemMapping: f.systemMapping,
        });
      }
    }

    const defsFor = async (entityTypeKey: string) =>
      await ctx.db
        .query("fieldDefs")
        .withIndex("by_entityTypeKey_and_order", (q) =>
          q.eq("entityTypeKey", entityTypeKey),
        )
        .take(200);

    const insertRecord = async (
      entityTypeKey: string,
      defs: Awaited<ReturnType<typeof defsFor>>,
      fields: Record<string, unknown>,
      extra?: { flagged?: boolean; restricted?: boolean },
    ) => {
      const patch = await buildRecordPatch(ctx, defs, fields);
      return await ctx.db.insert("records", {
        entityTypeKey,
        createdBy: args.adminUserId,
        flagged: extra?.flagged,
        restricted: extra?.restricted,
        ...patch,
      });
    };

    // Organisations first so relations can point at them.
    const orgDefs = await defsFor("organisation");
    const orgIds = new Map<string, Id<"records">>();
    for (const seed of organisationSeeds()) {
      const id = await insertRecord("organisation", orgDefs, seed.fields);
      orgIds.set(seed.key, id);
    }

    const contactDefs = await defsFor("contact");
    const contactIds = new Map<string, Id<"records">>();
    for (const seed of contactSeeds()) {
      const fields: Record<string, unknown> = { ...seed.fields };
      const orgId = orgIds.get(seed.org);
      if (orgId !== undefined) {
        fields.organisation = orgId;
      }
      const id = await insertRecord("contact", contactDefs, fields, {
        flagged: "flagged" in seed ? seed.flagged : undefined,
        restricted: "restricted" in seed ? seed.restricted : undefined,
      });
      contactIds.set(String(seed.fields.name), id);
    }

    const giftDefs = await defsFor("gift");
    for (const seed of giftSeeds(args.now)) {
      const fields: Record<string, unknown> = { ...seed.fields };
      if (seed.org !== undefined) {
        const orgId = orgIds.get(seed.org);
        if (orgId !== undefined) {
          fields.funderOrg = orgId;
        }
      }
      await insertRecord("gift", giftDefs, fields);
    }

    const pipelineDefs = await defsFor("pipeline");
    for (const seed of pipelineSeeds()) {
      await insertRecord("pipeline", pipelineDefs, { ...seed });
    }

    const deadlineDefs = await defsFor("deadline");
    for (const seed of deadlineSeeds(args.now)) {
      const fields: Record<string, unknown> = { ...seed.fields };
      if ("org" in seed && seed.org !== undefined) {
        const orgId = orgIds.get(seed.org);
        if (orgId !== undefined) {
          fields.funderOrg = orgId;
        }
      }
      await insertRecord("deadline", deadlineDefs, fields);
    }

    for (const seed of activitySeeds(args.now)) {
      await ctx.db.insert("activities", {
        recordId:
          "contact" in seed && seed.contact !== undefined
            ? contactIds.get(seed.contact)
            : undefined,
        kind: seed.kind,
        body: seed.body,
        detail: "detail" in seed ? seed.detail : undefined,
        team: "team" in seed ? seed.team : undefined,
        happenedAt: seed.happenedAt,
      });
    }

    for (const seed of taskSeeds(args.now)) {
      await ctx.db.insert("tasks", {
        title: seed.title,
        recordName: "recordName" in seed ? seed.recordName : undefined,
        assigneeName: seed.assigneeName,
        team: seed.team,
        dueAt: seed.dueAt,
        done: false,
      });
    }

    for (const [financialYear, targetMinor] of TARGET_SEEDS) {
      await ctx.db.insert("targets", { financialYear, targetMinor });
    }

    return null;
  },
});
