import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (
      user === null ||
      user.disabled ||
      (user.role !== "superadmin" && !user.customerId)
    ) {
      return null;
    }
    return {
      _id: user._id,
      name: user.name ?? user.email ?? "Unknown",
      email: user.email,
      role: user.role ?? "user",
      team: user.team,
      customerId: user.customerId,
      company: user.customerId
        ? (await ctx.db.get("shippingCompanies", user.customerId))?.name
        : undefined,
    };
  },
});
