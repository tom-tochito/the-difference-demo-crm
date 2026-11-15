import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin, requireUser } from "./lib/auth";
import {
  companyV,
  quoteV,
  shipmentV,
  chargeV,
  stageV,
  documentTypeV,
  docStatusV,
  modeV,
  STATUSES,
  total,
  invoiceState,
  milestones,
} from "./shippingModel";
import type { Charge } from "./shippingModel";

export async function settings(ctx: QueryCtx | MutationCtx) {
  const s = await ctx.db
    .query("shippingSettings")
    .withIndex("by_key", (q) => q.eq("key", "demo"))
    .unique();
  if (!s) throw new ConvexError("Freight demo has not been initialized.");
  return s;
}
export async function reference(ctx: MutationCtx, prefix: string) {
  const s = await settings(ctx);
  await ctx.db.patch("shippingSettings", s._id, {
    nextSequence: s.nextSequence + 1,
  });
  return `${prefix}-${String(s.nextSequence).padStart(5, "0")}`;
}
function text(value: string, label: string) {
  if (!value.trim() || value.length > 2000)
    throw new ConvexError(`${label} is required (maximum 2,000 characters).`);
}
function finite(n: number, label: string, min = 0) {
  if (!Number.isFinite(n) || n < min)
    throw new ConvexError(
      `${label} must be a finite number of at least ${min}.`,
    );
}
export function validateCharges(charges: Charge[]) {
  if (!charges.length || charges.length > 30)
    throw new ConvexError("Include between 1 and 30 charge lines.");
  for (const c of charges) {
    text(c.description, "Charge description");
    finite(c.quantity, "Quantity", 0.001);
    finite(c.unitMinor, "Price");
    finite(c.costMinor, "Cost");
    if (
      !Number.isSafeInteger(c.unitMinor) ||
      !Number.isSafeInteger(c.costMinor)
    )
      throw new ConvexError("Amounts must use whole minor units.");
  }
  if (!Number.isSafeInteger(total(charges)) || total(charges) <= 0)
    throw new ConvexError("Total must be a positive safe amount.");
}
async function validateRoute(
  ctx: MutationCtx,
  data: {
    customerId: Id<"shippingCompanies">;
    origin: string;
    destination: string;
    cargo: string;
    weightKg: number;
    volumeM3: number;
    packages: number;
    etd: number;
    eta: number;
  },
) {
  if (!(await ctx.db.get("shippingCompanies", data.customerId)))
    throw new ConvexError("Customer not found.");
  text(data.origin, "Origin");
  text(data.destination, "Destination");
  text(data.cargo, "Cargo");
  finite(data.weightKg, "Weight", 0.001);
  finite(data.volumeM3, "Volume");
  finite(data.packages, "Packages", 1);
  if (!Number.isInteger(data.packages))
    throw new ConvexError("Packages must be a whole number.");
  finite(data.etd, "Departure date");
  finite(data.eta, "Arrival date");
  if (data.eta < data.etd)
    throw new ConvexError("Arrival cannot be before departure.");
}
export async function activity(
  ctx: MutationCtx,
  body: string,
  customerId?: Id<"shippingCompanies">,
  shipmentId?: Id<"shippingShipments">,
  visible = false,
  author = "Demo operations",
) {
  await ctx.db.insert("shippingActivities", {
    body,
    customerId,
    shipmentId,
    public: visible,
    author,
    happenedAt: Date.now(),
  });
}
async function ship(ctx: MutationCtx | QueryCtx, id: Id<"shippingShipments">) {
  const s = await ctx.db.get("shippingShipments", id);
  if (!s) throw new ConvexError("Shipment not found.");
  return s;
}
export async function createChecklist(
  ctx: MutationCtx,
  id: Id<"shippingShipments">,
  mode: "sea" | "air" | "road",
  owner: string,
) {
  const config = await settings(ctx);
  for (const type of config.requirements[mode])
    await ctx.db.insert("shippingDocuments", {
      shipmentId: id,
      type,
      status: "Missing",
      owner,
      shared: false,
      updatedAt: Date.now(),
    });
}

// The complete demo snapshot is deliberately bounded. Never silently truncate financial totals.
export const overview = query({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    await requireUser(ctx);
    const tables = [
      "shippingCompanies",
      "shippingContacts",
      "shippingEnquiries",
      "shippingQuotes",
      "shippingBookings",
      "shippingShipments",
      "shippingDocuments",
      "shippingTasks",
      "shippingExceptions",
      "shippingActivities",
      "shippingInvoices",
      "shippingPayments",
    ] as const;
    const [
      companies,
      contacts,
      enquiries,
      quotes,
      bookings,
      shipments,
      documents,
      tasks,
      exceptions,
      activities,
      invoices,
      payments,
    ] = await Promise.all([
      ctx.db.query("shippingCompanies").take(2001),
      ctx.db.query("shippingContacts").take(2001),
      ctx.db.query("shippingEnquiries").take(2001),
      ctx.db.query("shippingQuotes").take(2001),
      ctx.db.query("shippingBookings").take(2001),
      ctx.db.query("shippingShipments").take(2001),
      ctx.db.query("shippingDocuments").take(2001),
      ctx.db.query("shippingTasks").take(2001),
      ctx.db.query("shippingExceptions").take(2001),
      ctx.db.query("shippingActivities").order("desc").take(200),
      ctx.db.query("shippingInvoices").take(2001),
      ctx.db.query("shippingPayments").take(2001),
    ]);
    [
      companies,
      contacts,
      enquiries,
      quotes,
      bookings,
      shipments,
      documents,
      tasks,
      exceptions,
      [],
      invoices,
      payments,
    ].forEach((rows, i) => {
      if (rows.length > 2000)
        throw new ConvexError(
          `Demo capacity reached for ${tables[i]}. Export/archive data before continuing.`,
        );
    });
    const config = await settings(ctx);
    return {
      companies,
      contacts,
      enquiries,
      quotes,
      bookings,
      shipments,
      documents,
      tasks,
      exceptions,
      activities,
      settings: config,
      invoices: invoices.map((i) => {
        const paid = payments
          .filter((p) => p.invoiceId === i._id)
          .reduce((s, p) => s + p.amountMinor, 0);
        return {
          ...i,
          paid,
          total: total(i.charges),
          balance: total(i.charges) - paid,
          status: invoiceState(i, paid, now),
        };
      }),
      payments,
    };
  },
});
export const saveCompany = mutation({
  args: { id: v.optional(v.id("shippingCompanies")), data: companyV },
  handler: async (ctx, { id, data }) => {
    const user = await requireUser(ctx);
    text(data.name, "Company name");
    text(data.country, "Country");
    finite(data.paymentDays, "Payment terms");
    if (id && !(await ctx.db.get("shippingCompanies", id)))
      throw new ConvexError("Company not found.");
    const customerId = id ?? (await ctx.db.insert("shippingCompanies", data));
    if (id) await ctx.db.patch("shippingCompanies", id, data);
    await activity(
      ctx,
      `${id ? "Updated" : "Created"} company ${data.name}`,
      customerId,
      undefined,
      false,
      user.name,
    );
    return customerId;
  },
});
export const saveContact = mutation({
  args: {
    id: v.optional(v.id("shippingContacts")),
    customerId: v.id("shippingCompanies"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireUser(ctx);
    text(data.name, "Contact name");
    if (!(await ctx.db.get("shippingCompanies", data.customerId)))
      throw new ConvexError("Company not found.");
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      throw new ConvexError("Enter a valid email.");
    if (id) {
      if (!(await ctx.db.get("shippingContacts", id)))
        throw new ConvexError("Contact not found.");
      await ctx.db.patch("shippingContacts", id, data);
    } else id = await ctx.db.insert("shippingContacts", data);
    await activity(ctx, `Contact saved: ${data.name}`, data.customerId);
    return id;
  },
});
export const saveEnquiry = mutation({
  args: { data: quoteV },
  handler: async (ctx, { data }) => {
    await requireUser(ctx);
    await validateRoute(ctx, data);
    validateCharges(data.charges);
    const id = await ctx.db.insert("shippingEnquiries", {
      ...data,
      reference: await reference(ctx, "ENQ"),
      stage: "New Enquiry",
      createdAt: Date.now(),
    });
    await activity(ctx, "New freight enquiry received", data.customerId);
    return id;
  },
});
export const quoteEnquiry = mutation({
  args: { id: v.id("shippingEnquiries") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const existing = await ctx.db
      .query("shippingQuotes")
      .withIndex("by_enquiryId", (q) => q.eq("enquiryId", id))
      .unique();
    if (existing) return existing._id;
    const e = await ctx.db.get("shippingEnquiries", id);
    if (!e) throw new ConvexError("Enquiry not found.");
    const { _id, _creationTime, reference: oldRef, ...data } = e;
    void _id;
    void _creationTime;
    const quoteId = await ctx.db.insert("shippingQuotes", {
      ...data,
      enquiryId: id,
      reference: await reference(ctx, "QUO"),
      stage: "Preparing Quote",
      createdAt: Date.now(),
    });
    await ctx.db.patch("shippingEnquiries", id, { stage: "Preparing Quote" });
    await activity(ctx, `${oldRef} converted to a quote`, e.customerId);
    return quoteId;
  },
});
export const saveQuote = mutation({
  args: { id: v.optional(v.id("shippingQuotes")), data: quoteV },
  handler: async (ctx, { id, data }) => {
    await requireUser(ctx);
    await validateRoute(ctx, data);
    validateCharges(data.charges);
    finite(data.validity, "Validity date");
    if (id) {
      const q = await ctx.db.get("shippingQuotes", id);
      if (!q) throw new ConvexError("Quote not found.");
      if (q.stage === "Won")
        throw new ConvexError(
          "Accepted quotes are locked. Duplicate it to make a new offer.",
        );
      await ctx.db.patch("shippingQuotes", id, data);
    } else
      id = await ctx.db.insert("shippingQuotes", {
        ...data,
        reference: await reference(ctx, "QUO"),
        stage: "Preparing Quote",
        createdAt: Date.now(),
      });
    await activity(ctx, "Freight quotation saved", data.customerId);
    return id;
  },
});
export const duplicateQuote = mutation({
  args: { id: v.id("shippingQuotes") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const q = await ctx.db.get("shippingQuotes", id);
    if (!q) throw new ConvexError("Quote not found.");
    const { _id, _creationTime, enquiryId, ...data } = q;
    void _id;
    void _creationTime;
    void enquiryId;
    return await ctx.db.insert("shippingQuotes", {
      ...data,
      reference: await reference(ctx, "QUO"),
      stage: "Preparing Quote",
      createdAt: Date.now(),
      validity: Date.now() + 14 * 86400000,
    });
  },
});
export const setQuoteStage = mutation({
  args: { id: v.id("shippingQuotes"), stage: stageV },
  handler: async (ctx, { id, stage }) => {
    await requireUser(ctx);
    const q = await ctx.db.get("shippingQuotes", id);
    if (!q) throw new ConvexError("Quote not found.");
    if (q.stage === "Won" || stage === "Won")
      throw new ConvexError(
        "Use Accept & book to accept a quote; accepted quotes are locked.",
      );
    await ctx.db.patch("shippingQuotes", id, { stage });
    if (q.enquiryId)
      await ctx.db.patch("shippingEnquiries", q.enquiryId, { stage });
    await activity(
      ctx,
      stage === "Quote Sent"
        ? `${q.reference}: quote sending simulated — no email sent`
        : `${q.reference}: ${stage}`,
      q.customerId,
    );
  },
});
export const acceptQuote = mutation({
  args: { id: v.id("shippingQuotes") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const existing = await ctx.db
      .query("shippingBookings")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", id))
      .unique();
    if (existing) return existing._id;
    const q = await ctx.db.get("shippingQuotes", id);
    if (!q) throw new ConvexError("Quote not found.");
    if (q.stage === "Lost" || q.validity < Date.now())
      throw new ConvexError(
        "Lost or expired quotes must be duplicated and renewed before acceptance.",
      );
    validateCharges(q.charges);
    const {
      _id,
      _creationTime,
      stage,
      enquiryId,
      reference: quoteRef,
      ...data
    } = q;
    void _id;
    void _creationTime;
    void stage;
    const bookingId = await ctx.db.insert("shippingBookings", {
      ...data,
      quoteId: id,
      reference: await reference(ctx, "BKG"),
      confirmed: false,
      createdAt: Date.now(),
    });
    await ctx.db.patch("shippingQuotes", id, { stage: "Won" });
    if (enquiryId)
      await ctx.db.patch("shippingEnquiries", enquiryId, { stage: "Won" });
    await activity(
      ctx,
      `${quoteRef} accepted; booking created with agreed charge snapshot`,
      q.customerId,
    );
    return bookingId;
  },
});
export const createBooking = mutation({
  args: { id: v.optional(v.id("shippingBookings")), data: quoteV },
  handler: async (ctx, { id: existingId, data }) => {
    await requireUser(ctx);
    await validateRoute(ctx, data);
    validateCharges(data.charges);
    if (existingId) {
      const booking = await ctx.db.get("shippingBookings", existingId);
      if (!booking) throw new ConvexError("Booking not found.");
      const shipment = await ctx.db
        .query("shippingShipments")
        .withIndex("by_bookingId", (q) => q.eq("bookingId", existingId))
        .unique();
      if (shipment)
        throw new ConvexError(
          "This booking has a shipment. Edit its operational details on the shipment.",
        );
      if (
        booking.quoteId &&
        (data.currency !== booking.currency ||
          JSON.stringify(data.charges) !== JSON.stringify(booking.charges))
      )
        throw new ConvexError(
          "Accepted pricing is locked. Keep the agreed currency and charges unchanged.",
        );
      await ctx.db.patch("shippingBookings", existingId, data);
      await activity(
        ctx,
        `${booking.reference}: booking details updated`,
        data.customerId,
      );
      return existingId;
    }
    const id = await ctx.db.insert("shippingBookings", {
      ...data,
      reference: await reference(ctx, "BKG"),
      confirmed: false,
      createdAt: Date.now(),
    });
    await activity(ctx, "Direct booking created", data.customerId);
    return id;
  },
});
export const confirmBooking = mutation({
  args: { id: v.id("shippingBookings") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const b = await ctx.db.get("shippingBookings", id);
    if (!b) throw new ConvexError("Booking not found.");
    if (!b.confirmed) {
      await ctx.db.patch("shippingBookings", id, { confirmed: true });
      await activity(
        ctx,
        `${b.reference}: carrier confirmation simulated — no external booking made`,
        b.customerId,
      );
    }
  },
});
export const planShipment = mutation({
  args: { id: v.id("shippingBookings") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("shippingShipments")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", id))
      .unique();
    if (existing) return existing._id;
    const b = await ctx.db.get("shippingBookings", id);
    if (!b) throw new ConvexError("Booking not found.");
    if (!b.confirmed)
      throw new ConvexError(
        "Simulate booking confirmation before planning the shipment.",
      );
    const customer = await ctx.db.get("shippingCompanies", b.customerId);
    const {
      _id,
      _creationTime,
      quoteId,
      confirmed,
      validity,
      reference: bookingRef,
      ...data
    } = b;
    void _id;
    void _creationTime;
    void quoteId;
    void confirmed;
    void validity;
    const sid = await ctx.db.insert("shippingShipments", {
      ...data,
      reference: await reference(ctx, "SHP"),
      bookingId: id,
      carrier: "To be assigned",
      service: "Standard",
      operator: user.name ?? "Demo operator",
      shipper: customer?.name ?? "",
      consignee: "To be confirmed",
      notifyParty: "Same as consignee",
      transportRef: "",
      transportName: "",
      seal: "",
      stops: "",
      status: "Planning",
      milestones: milestones(b.etd, b.eta),
      updatedAt: Date.now(),
    });
    await createChecklist(ctx, sid, b.mode, user.name ?? "Operations");
    await activity(ctx, `${bookingRef}: shipment planned`, b.customerId, sid);
    return sid;
  },
});
export const saveShipment = mutation({
  args: {
    id: v.optional(v.id("shippingShipments")),
    data: shipmentV,
    charges: v.array(chargeV),
  },
  handler: async (ctx, { id, data, charges }) => {
    await requireUser(ctx);
    await validateRoute(ctx, data);
    validateCharges(charges);
    if (id) {
      const old = await ship(ctx, id);
      if (
        old.currency !== data.currency &&
        (await ctx.db
          .query("shippingInvoices")
          .withIndex("by_shipmentId", (q) => q.eq("shipmentId", id!))
          .first())
      )
        throw new ConvexError("Currency is locked once invoiced.");
      await ctx.db.patch("shippingShipments", id, {
        ...data,
        charges,
        updatedAt: Date.now(),
      });
      if (old.mode !== data.mode) {
        const docs = await ctx.db
          .query("shippingDocuments")
          .withIndex("by_shipmentId", (q) => q.eq("shipmentId", id!))
          .take(100);
        const config = await settings(ctx);
        for (const type of config.requirements[data.mode])
          if (!docs.some((d) => d.type === type))
            await ctx.db.insert("shippingDocuments", {
              shipmentId: id,
              type,
              status: "Missing",
              owner: data.operator,
              shared: false,
              updatedAt: Date.now(),
            });
      }
    } else {
      id = await ctx.db.insert("shippingShipments", {
        ...data,
        charges,
        reference: await reference(ctx, "SHP"),
        status: "Planning",
        milestones: milestones(data.etd, data.eta),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await createChecklist(ctx, id, data.mode, data.operator);
    }
    await activity(ctx, "Shipment details updated", data.customerId, id);
    return id;
  },
});
export const advanceShipment = mutation({
  args: { id: v.id("shippingShipments"), expectedStatus: v.string() },
  handler: async (ctx, { id, expectedStatus }) => {
    await requireUser(ctx);
    const s = await ship(ctx, id);
    if (s.status !== expectedStatus) return s.status;
    const next = STATUSES.indexOf(s.status as (typeof STATUSES)[number]) + 1;
    if (next >= STATUSES.length || next < 1) return s.status;
    const nextStatus = STATUSES[next];
    await ctx.db.patch("shippingShipments", id, {
      status: nextStatus,
      milestones: s.milestones.map((m, i) =>
        i === next ? { ...m, actual: Date.now() } : m,
      ),
      updatedAt: Date.now(),
    });
    await activity(
      ctx,
      `Simulated tracking update: ${nextStatus}`,
      s.customerId,
      id,
      true,
    );
    return nextStatus;
  },
});
export const addNote = mutation({
  args: {
    customerId: v.optional(v.id("shippingCompanies")),
    shipmentId: v.optional(v.id("shippingShipments")),
    body: v.string(),
    public: v.boolean(),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    text(args.body, "Note");
    let cid = args.customerId;
    if (args.shipmentId) cid = (await ship(ctx, args.shipmentId)).customerId;
    if (!cid || !(await ctx.db.get("shippingCompanies", cid)))
      throw new ConvexError("Choose a valid customer or shipment.");
    await activity(ctx, args.body, cid, args.shipmentId, args.public, u.name);
  },
});
export const addTask = mutation({
  args: {
    customerId: v.optional(v.id("shippingCompanies")),
    shipmentId: v.optional(v.id("shippingShipments")),
    title: v.string(),
    assignee: v.string(),
    priority: v.union(v.literal("Low"), v.literal("Normal"), v.literal("High")),
    dueAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    text(args.title, "Title");
    text(args.assignee, "Assignee");
    finite(args.dueAt, "Due date");
    const customerId = args.shipmentId
      ? (await ship(ctx, args.shipmentId)).customerId
      : args.customerId;
    if (!customerId || !(await ctx.db.get("shippingCompanies", customerId)))
      throw new ConvexError("Choose a valid customer or shipment.");
    const id = await ctx.db.insert("shippingTasks", {
      ...args,
      customerId,
      done: false,
      resolution: "",
    });
    await activity(
      ctx,
      `Task created: ${args.title}`,
      customerId,
      args.shipmentId,
    );
    return id;
  },
});
export const completeTask = mutation({
  args: { id: v.id("shippingTasks"), resolution: v.string() },
  handler: async (ctx, { id, resolution }) => {
    await requireUser(ctx);
    text(resolution, "Resolution note");
    const t = await ctx.db.get("shippingTasks", id);
    if (!t) throw new ConvexError("Task not found.");
    await ctx.db.patch("shippingTasks", id, { done: true, resolution });
    await activity(
      ctx,
      `Completed ${t.title}: ${resolution}`,
      t.customerId,
      t.shipmentId,
    );
  },
});
export const resolveException = mutation({
  args: { id: v.id("shippingExceptions"), resolution: v.string() },
  handler: async (ctx, { id, resolution }) => {
    await requireUser(ctx);
    text(resolution, "Resolution note");
    const e = await ctx.db.get("shippingExceptions", id);
    if (!e) throw new ConvexError("Exception not found.");
    const s = await ship(ctx, e.shipmentId);
    await ctx.db.patch("shippingExceptions", id, {
      resolved: true,
      resolution,
    });
    await activity(
      ctx,
      `Resolved ${e.title}: ${resolution}`,
      s.customerId,
      s._id,
    );
  },
});
export const uploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
export const saveDocument = mutation({
  args: {
    id: v.optional(v.id("shippingDocuments")),
    shipmentId: v.id("shippingShipments"),
    type: documentTypeV,
    status: docStatusV,
    owner: v.string(),
    shared: v.boolean(),
    storageId: v.optional(v.id("_storage")),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireUser(ctx);
    const s = await ship(ctx, data.shipmentId);
    text(data.owner, "Owner");
    if (data.storageId) {
      const meta = await ctx.db.system.get("_storage", data.storageId);
      if (
        !meta ||
        meta.size > 10 * 1024 * 1024 ||
        !["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(
          meta.contentType ?? "",
        )
      )
        throw new ConvexError("Use PDF, PNG, JPEG or text files up to 10 MB.");
    }
    if (id) {
      const d = await ctx.db.get("shippingDocuments", id);
      if (!d || d.shipmentId !== data.shipmentId)
        throw new ConvexError("Document not found for this shipment.");
      await ctx.db.patch("shippingDocuments", id, {
        ...data,
        updatedAt: Date.now(),
      });
      if (data.storageId && d.storageId && d.storageId !== data.storageId)
        await ctx.storage.delete(d.storageId);
    } else
      id = await ctx.db.insert("shippingDocuments", {
        ...data,
        updatedAt: Date.now(),
      });
    await activity(
      ctx,
      `${data.type}: ${data.status}`,
      s.customerId,
      s._id,
      data.shared,
    );
    return id;
  },
});
export const documentUrl = query({
  args: { id: v.id("shippingDocuments") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const d = await ctx.db.get("shippingDocuments", id);
    return d?.storageId ? await ctx.storage.getUrl(d.storageId) : null;
  },
});
export const setRequirements = mutation({
  args: { mode: modeV, types: v.array(documentTypeV) },
  handler: async (ctx, { mode, types }) => {
    await requireAdmin(ctx);
    if (!types.length || new Set(types).size !== types.length)
      throw new ConvexError("Choose at least one unique document type.");
    const config = await settings(ctx);
    await ctx.db.patch("shippingSettings", config._id, {
      requirements: { ...config.requirements, [mode]: types },
    });
  },
});
export const createInvoice = mutation({
  args: { shipmentId: v.id("shippingShipments") },
  handler: async (ctx, { shipmentId }) => {
    await requireUser(ctx);
    const s = await ship(ctx, shipmentId);
    const existing = await ctx.db
      .query("shippingInvoices")
      .withIndex("by_shipmentId", (q) => q.eq("shipmentId", shipmentId))
      .unique();
    if (existing) return existing._id;
    const c = await ctx.db.get("shippingCompanies", s.customerId);
    validateCharges(s.charges);
    const id = await ctx.db.insert("shippingInvoices", {
      shipmentId,
      customerId: s.customerId,
      reference: await reference(ctx, "INV"),
      currency: s.currency,
      charges: s.charges,
      dueAt: Date.now() + (c?.paymentDays ?? 30) * 86400000,
      issued: false,
    });
    await activity(ctx, "Draft invoice created", s.customerId, s._id);
    return id;
  },
});
export const issueInvoice = mutation({
  args: { id: v.id("shippingInvoices") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const i = await ctx.db.get("shippingInvoices", id);
    if (!i) throw new ConvexError("Invoice not found.");
    if (i.issued) return;
    await ctx.db.patch("shippingInvoices", id, {
      issued: true,
      issuedAt: Date.now(),
    });
    await activity(
      ctx,
      `${i.reference} issued in demo — no email sent`,
      i.customerId,
      i.shipmentId,
    );
  },
});
export const recordPayment = mutation({
  args: {
    id: v.id("shippingInvoices"),
    amountMinor: v.number(),
    requestId: v.string(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const duplicate = await ctx.db
      .query("shippingPayments")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique();
    if (duplicate) {
      if (duplicate.invoiceId !== args.id)
        throw new ConvexError("Payment request already used.");
      return duplicate._id;
    }
    text(args.requestId, "Request ID");
    text(args.reference, "Reference");
    const i = await ctx.db.get("shippingInvoices", args.id);
    if (!i?.issued) throw new ConvexError("Issue the invoice first.");
    const payments = await ctx.db
      .query("shippingPayments")
      .withIndex("by_invoiceId", (q) => q.eq("invoiceId", args.id))
      .take(2001);
    if (payments.length > 2000)
      throw new ConvexError("Payment capacity reached.");
    const balance =
      total(i.charges) - payments.reduce((s, p) => s + p.amountMinor, 0);
    if (
      !Number.isSafeInteger(args.amountMinor) ||
      args.amountMinor <= 0 ||
      args.amountMinor > balance
    )
      throw new ConvexError(
        "Payment must be positive and cannot exceed the remaining balance.",
      );
    const id = await ctx.db.insert("shippingPayments", {
      invoiceId: args.id,
      amountMinor: args.amountMinor,
      requestId: args.requestId,
      reference: args.reference,
      receivedAt: Date.now(),
    });
    await activity(
      ctx,
      `${i.reference}: demo payment recorded — no money charged`,
      i.customerId,
      i.shipmentId,
    );
    return id;
  },
});

// Explicit allowlist: the preview never receives operational notes, costs or unshared documents.
export const portal = query({
  args: {
    customerId: v.optional(v.id("shippingCompanies")),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const companies = await ctx.db.query("shippingCompanies").take(200);
    const selected = args.customerId ?? companies[0]?._id;
    const rows = selected
      ? await ctx.db
          .query("shippingShipments")
          .withIndex("by_customerId", (q) => q.eq("customerId", selected))
          .take(200)
      : [];
    const shipments = await Promise.all(
      rows
        .filter(
          (s) =>
            !args.reference ||
            s.reference.toLowerCase().includes(args.reference.toLowerCase()),
        )
        .map(async (s) => {
          const docs = await ctx.db
            .query("shippingDocuments")
            .withIndex("by_shipmentId", (q) => q.eq("shipmentId", s._id))
            .take(100);
          const updates = await ctx.db
            .query("shippingActivities")
            .withIndex("by_shipmentId", (q) => q.eq("shipmentId", s._id))
            .order("desc")
            .take(100);
          return {
            id: s._id,
            reference: s.reference,
            origin: s.origin,
            destination: s.destination,
            mode: s.mode,
            status: s.status,
            eta: s.eta,
            updatedAt: s.updatedAt,
            stops: s.stops,
            milestones: s.milestones,
            documents: await Promise.all(
              docs
                .filter((d) => d.shared && d.status === "Approved")
                .map(async (d) => ({
                  type: d.type,
                  status: d.status,
                  url: d.storageId
                    ? await ctx.storage.getUrl(d.storageId)
                    : null,
                })),
            ),
            updates: updates
              .filter((a) => a.public)
              .map((a) => ({ body: a.body, happenedAt: a.happenedAt })),
          };
        }),
    );
    return {
      companies: companies.map((c) => ({ id: c._id, name: c.name })),
      selected,
      shipments,
    };
  },
});
export const search = query({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    await requireUser(ctx);
    const needle = text.toLowerCase();
    const [companies, shipments, quotes] = await Promise.all([
      ctx.db.query("shippingCompanies").take(2000),
      ctx.db.query("shippingShipments").take(2000),
      ctx.db.query("shippingQuotes").take(2000),
    ]);
    return [
      ...companies
        .filter((c) => c.name.toLowerCase().includes(needle))
        .slice(0, 5)
        .map((c) => ({
          id: c._id,
          label: c.name,
          type: "Customer",
          href: `/shipping/customers?id=${c._id}`,
        })),
      ...shipments
        .filter((s) =>
          `${s.reference} ${s.origin} ${s.destination}`
            .toLowerCase()
            .includes(needle),
        )
        .slice(0, 5)
        .map((s) => ({
          id: s._id,
          label: s.reference,
          type: "Shipment",
          href: `/shipping/shipments?id=${s._id}`,
        })),
      ...quotes
        .filter((q) => q.reference.toLowerCase().includes(needle))
        .slice(0, 5)
        .map((q) => ({
          id: q._id,
          label: q.reference,
          type: "Quote",
          href: `/shipping/quotes?id=${q._id}`,
        })),
    ];
  },
});
