import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import {
  CLOSED_PIPELINE_STAGES,
  CURRENT_FY,
  DAY_MS,
  ENTITY_KEYS,
} from "./lib/constants";

// Demo-scale aggregation: the seed dataset is a few hundred records, so
// bounded `.take()` reads are fine here. At real scale these counters
// would move to @convex-dev/aggregate.
const SCAN_LIMIT = 1000;

export const overview = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const contacts = await ctx.db
      .query("records")
      .withIndex("by_entityTypeKey", (q) =>
        q.eq("entityTypeKey", ENTITY_KEYS.contact),
      )
      .take(SCAN_LIMIT);
    const organisations = await ctx.db
      .query("records")
      .withIndex("by_entityTypeKey", (q) =>
        q.eq("entityTypeKey", ENTITY_KEYS.organisation),
      )
      .take(SCAN_LIMIT);
    const pipeline = await ctx.db
      .query("records")
      .withIndex("by_entityTypeKey", (q) =>
        q.eq("entityTypeKey", ENTITY_KEYS.pipeline),
      )
      .take(SCAN_LIMIT);
    const gifts = await ctx.db
      .query("records")
      .withIndex("by_entityTypeKey", (q) =>
        q.eq("entityTypeKey", ENTITY_KEYS.gift),
      )
      .take(SCAN_LIMIT);
    const deadlines = await ctx.db
      .query("records")
      .withIndex("by_entityTypeKey_and_dueAt", (q) =>
        q
          .eq("entityTypeKey", ENTITY_KEYS.deadline)
          .gte("dueAt", args.now)
          .lt("dueAt", args.now + 30 * DAY_MS),
      )
      .take(SCAN_LIMIT);

    const newContactsThisMonth = contacts.filter(
      (c) => c._creationTime > args.now - 30 * DAY_MS,
    ).length;

    const openDeals = pipeline.filter(
      (p) =>
        p.stage !== undefined &&
        !CLOSED_PIPELINE_STAGES.includes(p.stage) &&
        (p.amountMinor ?? 0) > 0,
    );
    const activePipelineMinor = openDeals.reduce(
      (sum, p) => sum + (p.amountMinor ?? 0),
      0,
    );

    const currentGifts = gifts.filter(
      (g) => g.fields.financialYear === CURRENT_FY,
    );
    const committedMinor = currentGifts.reduce(
      (sum, g) => sum + (g.amountMinor ?? 0),
      0,
    );
    const target = await ctx.db
      .query("targets")
      .withIndex("by_financialYear", (q) => q.eq("financialYear", CURRENT_FY))
      .unique();

    const byProgramme = new Map<string, number>();
    for (const deal of openDeals) {
      const programme =
        typeof deal.fields.programme === "string"
          ? deal.fields.programme
          : "General fundraising";
      byProgramme.set(
        programme,
        (byProgramme.get(programme) ?? 0) + (deal.amountMinor ?? 0),
      );
    }
    const pipelineByProgramme = [...byProgramme.entries()]
      .map(([programme, amountMinor]) => ({ programme, amountMinor }))
      .sort((a, b) => b.amountMinor - a.amountMinor);

    const flagged = contacts.filter((c) => c.flagged === true).slice(0, 10);

    const recentActivities = await ctx.db
      .query("activities")
      .withIndex("by_happenedAt")
      .order("desc")
      .take(8);

    const openTasks = await ctx.db
      .query("tasks")
      .withIndex("by_done_and_dueAt", (q) => q.eq("done", false))
      .take(10);

    return {
      totalContacts: contacts.length,
      newContactsThisMonth,
      totalOrganisations: organisations.length,
      activePipelineMinor,
      openDealCount: openDeals.length,
      committedMinor,
      targetMinor: target?.targetMinor ?? 0,
      deadlinesDueSoon: deadlines.length,
      pipelineByProgramme,
      flagged: flagged.map((c) => ({ _id: c._id, name: c.name })),
      recentActivities,
      openTasks,
    };
  },
});
