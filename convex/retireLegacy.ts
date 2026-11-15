// One-time, bounded migration. Remove this module after the verified production cutover.
import { internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
export const run = internalMutation({
  args: { backupSha256: v.string() },
  handler: async (ctx, { backupSha256 }) => {
    if (
      backupSha256 !==
      "708c8aee99ae23e8954b500fa0b5b59f1a379ae862997ab785fabe1bb34b4da0"
    )
      throw new ConvexError("Verified backup acknowledgement required.");
    const marker = await ctx.db
      .query("platformMigrations")
      .withIndex("by_key", (q) => q.eq("key", "freight-only-v2"))
      .unique();
    if (marker) return "Already retired";
    const users = await ctx.db.query("users").take(501);
    if (users.length > 500 || !users.some((u) => u.role === "superadmin"))
      throw new ConvexError("Provision freight accounts first.");
    const tables = [
      "records",
      "activities",
      "tasks",
      "targets",
      "fieldDefs",
      "entityTypes",
    ] as const;
    const rows = await Promise.all(
      tables.map((t) => ctx.db.query(t).take(501)),
    );
    if (rows.some((r) => r.length > 500))
      throw new ConvexError("Legacy data exceeds bounded migration size.");
    for (let i = 0; i < tables.length; i++)
      for (const r of rows[i]) await ctx.db.delete(tables[i], r._id);
    for (const u of users.filter((u) =>
      u.email?.endsWith("@demo.thedifference.org"),
    )) {
      const sessions = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", u._id))
        .take(500);
      for (const session of sessions) {
        for (const token of await ctx.db
          .query("authRefreshTokens")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .take(500))
          await ctx.db.delete("authRefreshTokens", token._id);
        await ctx.db.delete("authSessions", session._id);
      }
      for (const account of await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", u._id))
        .take(100)) {
        for (const code of await ctx.db
          .query("authVerificationCodes")
          .withIndex("accountId", (q) => q.eq("accountId", account._id))
          .take(100))
          await ctx.db.delete("authVerificationCodes", code._id);
        await ctx.db.delete("authAccounts", account._id);
      }
      await ctx.db.delete("users", u._id);
    }
    await ctx.db.insert("platformMigrations", {
      key: "freight-only-v2",
      completedAt: Date.now(),
      detail: `Legacy domain and accounts retired after verified backup ${backupSha256}`,
    });
    return "Legacy application data retired; freight data preserved.";
  },
});
