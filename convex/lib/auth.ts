import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Not signed in.");
  }
  const user = await ctx.db.get("users", userId);
  if (user === null || user.disabled) {
    throw new ConvexError("User record not found.");
  }
  return user;
}

export async function requireSuperadmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "superadmin") {
    throw new ConvexError("Superadmin access required.");
  }
  return user;
}
