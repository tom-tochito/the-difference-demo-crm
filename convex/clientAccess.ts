import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
type Ctx = QueryCtx | MutationCtx;
export type JobKind = "shipment" | "enquiry" | "quote" | "booking";
export async function clientIdentity(
  ctx: Ctx,
  selected?: Id<"shippingCompanies">,
) {
  const user = await requireUser(ctx);
  const customerId = user.role === "superadmin" ? selected : user.customerId;
  if (!customerId) throw new ConvexError("Choose a client workspace.");
  if (selected && user.role !== "superadmin" && selected !== user.customerId)
    throw new ConvexError("Access denied.");
  if (!(await ctx.db.get("shippingCompanies", customerId)))
    throw new ConvexError("Client workspace unavailable.");
  return { user, customerId };
}
export async function jobAccess(
  ctx: Ctx,
  user: Doc<"users">,
  kind: JobKind,
  id: string,
): Promise<boolean> {
  if (user.disabled) return false;
  const table = (
    {
      shipment: "shippingShipments",
      enquiry: "shippingEnquiries",
      quote: "shippingQuotes",
      booking: "shippingBookings",
    } as const
  )[kind];
  const normalized = ctx.db.normalizeId(table, id);
  if (!normalized) return false;
  const row = await ctx.db.get(table, normalized);
  if (!row) return false;
  if (user.role === "superadmin") return true;
  if (row.customerId !== user.customerId) return false;
  if (user.role === "admin") return true;
  const assignments = await ctx.db
    .query("shippingAssignments")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .take(2001);
  if (assignments.length > 2000)
    throw new ConvexError("Assignment limit reached.");
  const targetKeys = await lineage(ctx, kind, id);
  for (const assignment of assignments) {
    if (assignment.customerId !== user.customerId) continue;
    const assignedKeys = await lineage(
      ctx,
      assignment.kind,
      assignment.entityId,
    );
    if (assignedKeys.some((key) => targetKeys.includes(key))) return true;
  }
  return false;
}
export async function requireJob(ctx: Ctx, kind: JobKind, id: string) {
  const user = await requireUser(ctx);
  if (!(await jobAccess(ctx, user, kind, id)))
    throw new ConvexError("Access denied.");
  return user;
}

async function lineage(ctx: Ctx, kind: JobKind, id: string): Promise<string[]> {
  const table = (
    {
      shipment: "shippingShipments",
      enquiry: "shippingEnquiries",
      quote: "shippingQuotes",
      booking: "shippingBookings",
    } as const
  )[kind];
  const normalized = ctx.db.normalizeId(table, id);
  if (!normalized) return [];
  const row = await ctx.db.get(table, normalized);
  if (!row) return [];
  const keys = [`${kind}:${id}`];
  if ("bookingId" in row && row.bookingId)
    keys.push(...(await lineage(ctx, "booking", row.bookingId)));
  if ("quoteId" in row && row.quoteId)
    keys.push(...(await lineage(ctx, "quote", row.quoteId)));
  if ("enquiryId" in row && row.enquiryId)
    keys.push(...(await lineage(ctx, "enquiry", row.enquiryId)));
  return keys;
}
