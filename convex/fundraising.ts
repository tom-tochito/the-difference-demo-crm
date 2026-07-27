import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import {
  CLOSED_PIPELINE_STAGES,
  CURRENT_FY,
  DAY_MS,
  ENTITY_KEYS,
} from "./lib/constants";

const SCAN_LIMIT = 1000;

async function allOfType(ctx: QueryCtx, entityTypeKey: string) {
  return await ctx.db
    .query("records")
    .withIndex("by_entityTypeKey", (q) => q.eq("entityTypeKey", entityTypeKey))
    .take(SCAN_LIMIT);
}

/** Income by category — committed vs target, across the FYs in `targets`. */
export const financialOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const targets = await ctx.db.query("targets").take(20);
    targets.sort((a, b) => a.financialYear.localeCompare(b.financialYear));
    const gifts = await allOfType(ctx, ENTITY_KEYS.gift);

    // Category order comes from the budgetCategory field definition, so
    // an admin edit to that field reorders the overview table too.
    const categoryDef = await ctx.db
      .query("fieldDefs")
      .withIndex("by_entityTypeKey_and_key", (q) =>
        q.eq("entityTypeKey", ENTITY_KEYS.gift).eq("key", "budgetCategory"),
      )
      .unique();
    const categories = categoryDef?.options ?? [];

    const years = targets.map((t) => t.financialYear);
    const rows = categories.map((category) => ({
      category,
      byYear: years.map((year) =>
        gifts
          .filter(
            (g) =>
              g.fields.financialYear === year &&
              g.fields.budgetCategory === category,
          )
          .reduce((sum, g) => sum + (g.amountMinor ?? 0), 0),
      ),
    }));
    const committedTotals = years.map((_, i) =>
      rows.reduce((sum, row) => sum + row.byYear[i], 0),
    );

    return {
      currentYear: CURRENT_FY,
      years,
      targets: targets.map((t) => t.targetMinor),
      rows,
      committedTotals,
    };
  },
});

/** Stat cards + full table for the committed gifts tab. */
export const committedGifts = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const gifts = await allOfType(ctx, ENTITY_KEYS.gift);
    const current = gifts.filter((g) => g.fields.financialYear === CURRENT_FY);

    const committedMinor = current.reduce(
      (sum, g) => sum + (g.amountMinor ?? 0),
      0,
    );
    const receivedMinor = current.reduce(
      (sum, g) =>
        sum +
        (typeof g.fields.received === "number" ? g.fields.received : 0),
      0,
    );
    const dueSoon = current.filter(
      (g) =>
        g.dueAt !== undefined &&
        g.dueAt >= args.now &&
        g.dueAt < args.now + 30 * DAY_MS,
    );
    dueSoon.sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
    const giftAidMinor = current
      .filter((g) => g.fields.giftAid === "Y")
      .reduce(
        (sum, g) =>
          sum +
          (typeof g.fields.received === "number" ? g.fields.received : 0),
        0,
      );
    const target = await ctx.db
      .query("targets")
      .withIndex("by_financialYear", (q) => q.eq("financialYear", CURRENT_FY))
      .unique();

    current.sort((a, b) => a.name.localeCompare(b.name));
    return {
      currentYear: CURRENT_FY,
      committedMinor,
      receivedMinor,
      giftAidMinor,
      targetMinor: target?.targetMinor ?? 0,
      dueSoonCount: dueSoon.length,
      nextDue: dueSoon[0]
        ? { name: dueSoon[0].name, dueAt: dueSoon[0].dueAt ?? 0 }
        : null,
      gifts: current,
    };
  },
});

/** Stat cards for the pipeline tab (rows come from records.list). */
export const pipelineStats = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const pipeline = await allOfType(ctx, ENTITY_KEYS.pipeline);
    const active = pipeline.filter(
      (p) => p.stage !== undefined && !CLOSED_PIPELINE_STAGES.includes(p.stage),
    );
    const withAsk = pipeline.filter((p) => (p.amountMinor ?? 0) > 0);
    const totalAskMinor = withAsk.reduce(
      (sum, p) => sum + (p.amountMinor ?? 0),
      0,
    );
    const weightedMinor = withAsk.reduce((sum, p) => {
      const likelihood =
        typeof p.fields.likelihood === "number" ? p.fields.likelihood : 0;
      return sum + Math.round((p.amountMinor ?? 0) * (likelihood / 100));
    }, 0);
    const likelihoods = pipeline
      .map((p) => p.fields.likelihood)
      .filter((x): x is number => typeof x === "number");
    const avgLikelihood =
      likelihoods.length > 0
        ? Math.round(
            likelihoods.reduce((a, b) => a + b, 0) / likelihoods.length,
          )
        : 0;
    const unsuccessful = pipeline.filter((p) => p.stage === "Unsuccessful");
    const unsuccessfulAskMinor = unsuccessful.reduce(
      (sum, p) => sum + (p.amountMinor ?? 0),
      0,
    );
    return {
      activeCount: active.length,
      totalAskMinor,
      weightedMinor,
      avgLikelihood,
      unsuccessfulCount: unsuccessful.length,
      unsuccessfulAskMinor,
    };
  },
});

/** Deadlines bucketed relative to `now` (passed in — queries can't read the clock). */
export const deadlines = query({
  args: {
    now: v.number(),
    type: v.optional(v.string()),
    lead: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    let all = await allOfType(ctx, ENTITY_KEYS.deadline);
    if (args.type !== undefined) {
      all = all.filter((d) => d.stage === args.type);
    }
    if (args.lead !== undefined) {
      all = all.filter((d) => d.fields.lead === args.lead);
    }
    all.sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));

    const completed = all.filter((d) => d.status === "Completed");
    const open = all.filter((d) => d.status !== "Completed");
    const overdue = open.filter((d) => (d.dueAt ?? 0) < args.now);
    const due30 = open.filter(
      (d) =>
        (d.dueAt ?? 0) >= args.now && (d.dueAt ?? 0) < args.now + 30 * DAY_MS,
    );
    const due90 = open.filter(
      (d) =>
        (d.dueAt ?? 0) >= args.now + 30 * DAY_MS &&
        (d.dueAt ?? 0) < args.now + 90 * DAY_MS,
    );
    return { overdue, due30, due90, completed };
  },
});
