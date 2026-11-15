import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { clientIdentity, jobAccess, requireJob } from "./clientAccess";
import { requireUser } from "./lib/auth";
import {
  activity,
  reference,
  settings,
  acceptQuoteTransaction,
} from "./shipping";
import {
  modeV,
  currencyV,
  documentTypeV,
  total,
  invoiceState,
  DAY,
} from "./shippingModel";

export const snapshot = query({
  args: { customerId: v.optional(v.id("shippingCompanies")), now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user, customerId } = await clientIdentity(ctx, args.customerId);
    const company = await ctx.db.get("shippingCompanies", customerId);
    const [es, qs, bs, ss, ts, is] = await Promise.all([
      ctx.db
        .query("shippingEnquiries")
        .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
        .take(2001),
      ctx.db
        .query("shippingQuotes")
        .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
        .take(2001),
      ctx.db
        .query("shippingBookings")
        .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
        .take(2001),
      ctx.db
        .query("shippingShipments")
        .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
        .take(2001),
      ctx.db
        .query("shippingTasks")
        .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
        .take(2001),
      ctx.db
        .query("shippingInvoices")
        .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
        .take(2001),
    ]);
    if ([es, qs, bs, ss, ts, is].some((x) => x.length > 2000))
      throw new ConvexError("Workspace capacity reached.");
    const visibleShipments: typeof ss = [];
    for (const s of ss)
      if (await jobAccess(ctx, user, "shipment", s._id))
        visibleShipments.push(s);
    const enquiries = [];
    for (const e of es)
      if (await jobAccess(ctx, user, "enquiry", e._id))
        enquiries.push({
          _id: e._id,
          reference: e.reference,
          origin: e.origin,
          destination: e.destination,
          cargo: e.cargo,
          mode: e.mode,
          stage: e.stage,
          etd: e.etd,
          eta: e.eta,
        });
    const quotes = [];
    for (const q of qs)
      if (await jobAccess(ctx, user, "quote", q._id))
        quotes.push({
          _id: q._id,
          reference: q.reference,
          origin: q.origin,
          destination: q.destination,
          mode: q.mode,
          stage: q.stage,
          validity: q.validity,
          currency: q.currency,
          charges: q.charges.map((c) => ({
            description: c.description,
            quantity: c.quantity,
            unitMinor: c.unitMinor,
          })),
          total: total(q.charges),
        });
    const bookings = [];
    for (const b of bs)
      if (await jobAccess(ctx, user, "booking", b._id))
        bookings.push({
          _id: b._id,
          reference: b.reference,
          origin: b.origin,
          destination: b.destination,
          confirmed: b.confirmed,
          currency: b.currency,
          total: total(b.charges),
        });
    const shipments = await Promise.all(
      visibleShipments.map(async (s) => {
        const docs = await ctx.db
          .query("shippingDocuments")
          .withIndex("by_shipmentId", (q) => q.eq("shipmentId", s._id))
          .take(100);
        const updates = await ctx.db
          .query("shippingActivities")
          .withIndex("by_shipmentId", (q) => q.eq("shipmentId", s._id))
          .order("desc")
          .take(200);
        return {
          _id: s._id,
          reference: s.reference,
          origin: s.origin,
          destination: s.destination,
          cargo: s.cargo,
          mode: s.mode,
          status: s.status,
          etd: s.etd,
          eta: s.eta,
          stops: s.stops,
          milestones: s.milestones,
          updatedAt: s.updatedAt,
          documents: await Promise.all(
            docs
              .filter((d) => d.shared)
              .map(async (d) => ({
                _id: d._id,
                type: d.type,
                status: d.status,
                filename: d.filename,
                url: d.storageId ? await ctx.storage.getUrl(d.storageId) : null,
              })),
          ),
          updates: updates
            .filter((a) => a.public)
            .map((a) => ({ body: a.body, happenedAt: a.happenedAt })),
        };
      }),
    );
    const tasks = ts
      .filter(
        (t) =>
          user.role !== "user" ||
          t.assignedUserId === user._id ||
          visibleShipments.some((s) => s._id === t.shipmentId),
      )
      .map((t) => ({
        _id: t._id,
        title: t.title,
        dueAt: t.dueAt,
        done: t.done,
        priority: t.priority,
        shipmentId: t.shipmentId,
        assignee: t.assignee,
        resolution: t.resolution,
      }));
    const invoices = [];
    for (const i of is)
      if (
        i.issued &&
        (user.role !== "user" ||
          (await jobAccess(ctx, user, "shipment", i.shipmentId)))
      ) {
        const payments = await ctx.db
          .query("shippingPayments")
          .withIndex("by_invoiceId", (q) => q.eq("invoiceId", i._id))
          .take(1000);
        const paid = payments.reduce((n, p) => n + p.amountMinor, 0);
        invoices.push({
          _id: i._id,
          reference: i.reference,
          currency: i.currency,
          total: total(i.charges),
          paid,
          balance: total(i.charges) - paid,
          dueAt: i.dueAt,
          status: invoiceState(i, paid, args.now ?? Date.now()),
        });
      }
    return {
      company: { id: customerId, name: company!.name },
      role: user.role,
      enquiries,
      quotes,
      bookings,
      shipments,
      tasks,
      invoices,
      requirements: (await settings(ctx)).requirements,
    };
  },
});
export const submitEnquiry = mutation({
  args: {
    origin: v.string(),
    destination: v.string(),
    cargo: v.string(),
    mode: modeV,
    weightKg: v.number(),
    volumeM3: v.number(),
    packages: v.number(),
    etd: v.number(),
    eta: v.number(),
    currency: currencyV,
  },
  handler: async (ctx, a) => {
    const { user, customerId } = await clientIdentity(ctx);
    if (
      [a.origin, a.destination, a.cargo].some(
        (s) => !s.trim() || s.length > 2000,
      ) ||
      !Number.isFinite(a.etd) ||
      !Number.isFinite(a.eta) ||
      a.eta < a.etd ||
      a.weightKg <= 0 ||
      a.volumeM3 < 0 ||
      !Number.isInteger(a.packages) ||
      a.packages < 1
    )
      throw new ConvexError("Provide valid route, cargo, weights and dates.");
    const id = await ctx.db.insert("shippingEnquiries", {
      ...a,
      customerId,
      dimensions: "",
      containers: "",
      incoterm: "FCA",
      validity: Date.now() + 14 * DAY,
      charges: [
        {
          description: "Rate requested — awaiting platform quotation",
          quantity: 1,
          unitMinor: 0,
          costMinor: 0,
        },
      ],
      reference: await reference(ctx, "ENQ"),
      stage: "New Enquiry",
      createdAt: Date.now(),
    });
    await ctx.db.insert("shippingAssignments", {
      customerId,
      userId: user._id,
      kind: "enquiry",
      entityId: id,
    });
    await activity(
      ctx,
      "Client submitted an enquiry",
      customerId,
      undefined,
      true,
      user.name,
    );
    return id;
  },
});
export const acceptQuote = mutation({
  args: { id: v.id("shippingQuotes") },
  handler: async (ctx, { id }) => {
    const user = await requireJob(ctx, "quote", id);
    if (user.role === "user")
      throw new ConvexError("Client admin approval required.");
    const q = await ctx.db.get("shippingQuotes", id);
    if (
      q?.stage !== "Quote Sent" &&
      q?.stage !== "Negotiation" &&
      q?.stage !== "Won"
    )
      throw new ConvexError(
        "This quotation has not been issued for acceptance.",
      );
    return acceptQuoteTransaction(ctx, id);
  },
});
export const completeTask = mutation({
  args: { id: v.id("shippingTasks"), resolution: v.string() },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx);
    const t = await ctx.db.get("shippingTasks", a.id);
    if (
      !t ||
      (u.role !== "superadmin" && t.customerId !== u.customerId) ||
      (u.role === "user" &&
        t.assignedUserId !== u._id &&
        (!t.shipmentId || !(await jobAccess(ctx, u, "shipment", t.shipmentId))))
    )
      throw new ConvexError("Access denied.");
    if (!a.resolution.trim() || a.resolution.length > 2000)
      throw new ConvexError("Add a completion note.");
    await ctx.db.patch("shippingTasks", a.id, {
      done: true,
      resolution: a.resolution,
    });
    await activity(
      ctx,
      `Client completed ${t.title}: ${a.resolution}`,
      t.customerId,
      t.shipmentId,
      true,
      u.name,
    );
  },
});
export const beginUpload = mutation({
  args: { shipmentId: v.id("shippingShipments"), type: documentTypeV },
  handler: async (ctx, a) => {
    const u = await requireJob(ctx, "shipment", a.shipmentId);
    const documentId = await ctx.db.insert("shippingDocuments", {
      ...a,
      status: "Draft",
      owner: u.name ?? "Client",
      shared: true,
      updatedAt: Date.now(),
    });
    const grantId = await ctx.db.insert("shippingUploadGrants", {
      userId: u._id,
      documentId,
      expiresAt: Date.now() + 15 * 60 * 1000,
      used: false,
    });
    return { grantId, url: await ctx.storage.generateUploadUrl() };
  },
});
export const finishUpload = mutation({
  args: {
    grantId: v.id("shippingUploadGrants"),
    storageId: v.id("_storage"),
    filename: v.string(),
  },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx),
      g = await ctx.db.get("shippingUploadGrants", a.grantId);
    if (!g || g.userId !== u._id || g.used || g.expiresAt < Date.now())
      throw new ConvexError("Upload session expired or unavailable.");
    const d = await ctx.db.get("shippingDocuments", g.documentId);
    if (!d) throw new ConvexError("Document not found.");
    await requireJob(ctx, "shipment", d.shipmentId);
    const m = await ctx.db.system.get("_storage", a.storageId);
    if (
      !m ||
      m._creationTime < g._creationTime ||
      m.size > 10 * 1024 * 1024 ||
      !["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(
        m.contentType ?? "",
      ) ||
      !a.filename.trim() ||
      a.filename.length > 240
    )
      throw new ConvexError(
        "Use a new PDF, PNG, JPEG or text file up to 10 MB.",
      );
    if (
      await ctx.db
        .query("shippingDocuments")
        .withIndex("by_storageId", (q) => q.eq("storageId", a.storageId))
        .first()
    )
      throw new ConvexError("Attachment already belongs to a document.");
    await ctx.db.patch("shippingUploadGrants", g._id, { used: true });
    await ctx.db.patch("shippingDocuments", d._id, {
      storageId: a.storageId,
      filename: a.filename,
      status: "Awaiting approval",
      updatedAt: Date.now(),
    });
    const s = await ctx.db.get("shippingShipments", d.shipmentId);
    await activity(
      ctx,
      `Client uploaded ${d.type} for review`,
      s!.customerId,
      d.shipmentId,
      true,
      u.name,
    );
  },
});
export const search = query({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const { user, customerId } = await clientIdentity(ctx);
    const needle = text.toLowerCase().slice(0, 200);
    const results = [];
    for (const [table, kind, section] of [
      ["shippingShipments", "shipment", "shipments"],
      ["shippingQuotes", "quote", "quotes"],
      ["shippingEnquiries", "enquiry", "enquiries"],
    ] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
        .take(2000);
      for (const row of rows)
        if (
          `${row.reference} ${row.origin} ${row.destination}`
            .toLowerCase()
            .includes(needle) &&
          (await jobAccess(ctx, user, kind, row._id))
        )
          results.push({
            id: row._id,
            label: row.reference,
            type: kind,
            href: `/shipping/${section}?id=${row._id}`,
          });
    }
    return results.slice(0, 15);
  },
});
