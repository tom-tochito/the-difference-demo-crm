/// <reference types="vite/client" />
import type { FunctionArgs } from "convex/server";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { DAY, invoiceState, total } from "./shippingModel";
const modules = import.meta.glob("./**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  const uid = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Test operator",
      role: "superadmin",
      email: "test@example.com",
    }),
  );
  const admin = t.withIdentity({ subject: `${uid}|test-session` });
  await t.mutation(internal.shippingSeed.initialize, {});
  return { t, admin, uid };
}
describe("Freight operations", () => {
  test("seed is consistent, idempotent and contains the walkthrough", async () => {
    const { t, admin } = await setup();
    const before = await admin.query(api.shipping.overview, {
      now: Date.now(),
    });
    expect(before.companies).toHaveLength(16);
    expect(before.quotes).toHaveLength(26);
    expect(before.shipments).toHaveLength(40);
    expect(before.enquiries.some((e) => e.reference === "ENQ-DEMO-START")).toBe(
      true,
    );
    await admin.mutation(api.shipping.saveCompany, {
      id: before.companies[0]._id,
      data: {
        name: "Edited",
        role: "Exporter",
        country: "GB",
        address: "Example",
        owner: "Test",
        tradeLanes: "GB-US",
        preferredMode: "sea",
        paymentDays: 30,
      },
    });
    await t.mutation(internal.shippingSeed.initialize, {});
    const after = await admin.query(api.shipping.overview, { now: Date.now() });
    expect(after.companies[0].name).toBe("Edited");
    expect(after.shipments.map((s) => s._id)).toEqual(
      before.shipments.map((s) => s._id),
    );
    for (const s of after.shipments) {
      expect(after.companies.some((c) => c._id === s.customerId)).toBe(true);
      expect(s.eta).toBeGreaterThanOrEqual(s.etd);
      if (["Departed", "In transit", "Arrived", "Delivered"].includes(s.status))
        expect(s.etd).toBeLessThanOrEqual(Date.now());
      expect(s.createdAt).toBeLessThanOrEqual(s.etd);
      if (s.bookingId) {
        const b = after.bookings.find((b) => b._id === s.bookingId)!;
        expect(b.currency).toBe(s.currency);
        expect(total(b.charges)).toBe(total(s.charges));
        expect(b.mode).toBe(s.mode);
      }
    }
  });
  test("enquiry to quote to booking to shipment is idempotent under repeated and concurrent requests", async () => {
    const { admin } = await setup();
    const d = await admin.query(api.shipping.overview, { now: Date.now() });
    const enquiry = d.enquiries.find((e) => e.reference === "ENQ-DEMO-START")!;
    const [qid, qid2] = await Promise.all([
      admin.mutation(api.shipping.quoteEnquiry, { id: enquiry._id }),
      admin.mutation(api.shipping.quoteEnquiry, { id: enquiry._id }),
    ]);
    expect(qid).toBe(qid2);
    const [bid, bid2] = await Promise.all([
      admin.mutation(api.shipping.acceptQuote, { id: qid }),
      admin.mutation(api.shipping.acceptQuote, { id: qid }),
    ]);
    expect(bid).toBe(bid2);
    const bookingData = Object.fromEntries(
      [
        "customerId",
        "mode",
        "origin",
        "destination",
        "cargo",
        "packages",
        "weightKg",
        "volumeM3",
        "dimensions",
        "containers",
        "etd",
        "eta",
        "incoterm",
        "currency",
        "validity",
        "charges",
      ].map((key) => [key, enquiry[key as keyof typeof enquiry]]),
    ) as FunctionArgs<typeof api.shipping.createBooking>["data"];
    await admin.mutation(api.shipping.createBooking, {
      id: bid,
      data: { ...bookingData, cargo: "Updated cargo description" },
    });
    await expect(
      admin.mutation(api.shipping.createBooking, {
        id: bid,
        data: {
          ...bookingData,
          currency: bookingData.currency === "GBP" ? "EUR" : "GBP",
        },
      }),
    ).rejects.toThrow("pricing is locked");

    await expect(
      admin.mutation(api.shipping.planShipment, { id: bid }),
    ).rejects.toThrow("confirmation");
    await admin.mutation(api.shipping.confirmBooking, { id: bid });
    const [sid, sid2] = await Promise.all([
      admin.mutation(api.shipping.planShipment, { id: bid }),
      admin.mutation(api.shipping.planShipment, { id: bid }),
    ]);
    expect(sid).toBe(sid2);
    expect(
      (
        await admin.query(api.shipping.overview, { now: Date.now() })
      ).shipments.find((s) => s._id === sid)?.milestones[0].actual,
    ).toBeLessThanOrEqual(Date.now());
    await expect(
      admin.mutation(api.shipping.createBooking, {
        id: bid,
        data: bookingData,
      }),
    ).rejects.toThrow("has a shipment");
    const next = await admin.query(api.shipping.overview, { now: Date.now() });
    expect(next.bookings.filter((b) => b.quoteId === qid)).toHaveLength(1);
    expect(next.shipments.filter((s) => s.bookingId === bid)).toHaveLength(1);
    expect(next.enquiries.find((e) => e._id === enquiry._id)?.stage).toBe(
      "Won",
    );
  });
  test("tracking retry advances only once and stops at delivered", async () => {
    const { admin } = await setup();
    const d = await admin.query(api.shipping.overview, { now: Date.now() });
    const s = d.shipments[0];
    await Promise.all([
      admin.mutation(api.shipping.advanceShipment, {
        id: s._id,
        expectedStatus: s.status,
      }),
      admin.mutation(api.shipping.advanceShipment, {
        id: s._id,
        expectedStatus: s.status,
      }),
    ]);
    let after = await admin.query(api.shipping.overview, { now: Date.now() });
    expect(after.shipments[0].status).toBe("Departed");
    for (const status of ["Departed", "In transit", "Arrived", "Delivered"])
      await admin.mutation(api.shipping.advanceShipment, {
        id: s._id,
        expectedStatus: status,
      });
    after = await admin.query(api.shipping.overview, { now: Date.now() });
    expect(after.shipments[0].status).toBe("Delivered");
    expect(
      after.shipments[0].milestones.every((m) => m.actual !== undefined),
    ).toBe(true);
  });
  test("payments enforce balance, issue state and request idempotency", async () => {
    const { admin } = await setup();
    const d = await admin.query(api.shipping.overview, { now: Date.now() });
    const i = d.invoices.find((i) => i.status === "Overdue" && i.balance > 0)!;
    await expect(
      admin.mutation(api.shipping.recordPayment, {
        id: i._id,
        amountMinor: i.balance + 1,
        requestId: "too-much",
        reference: "demo",
      }),
    ).rejects.toThrow("remaining balance");
    await expect(
      admin.mutation(api.shipping.recordPayment, {
        id: i._id,
        amountMinor: 0.5,
        requestId: "fraction",
        reference: "demo",
      }),
    ).rejects.toThrow();
    const amount = Math.round(i.balance / 2);
    const args = {
      id: i._id,
      amountMinor: amount,
      requestId: "one-payment",
      reference: "demo",
    };
    const p1 = await admin.mutation(api.shipping.recordPayment, args);
    const p2 = await admin.mutation(api.shipping.recordPayment, args);
    expect(p1).toBe(p2);
    const after = await admin.query(api.shipping.overview, { now: Date.now() });
    expect(after.invoices.find((row) => row._id === i._id)?.balance).toBe(
      i.balance - amount,
    );
    const draft = d.invoices.find((i) => !i.issued)!;
    await expect(
      admin.mutation(api.shipping.recordPayment, {
        ...args,
        id: draft._id,
        requestId: "draft",
      }),
    ).rejects.toThrow("Issue");
  });
  test("invoice status and minor-unit rounding remain explicit", () => {
    const charges = [
      { description: "Freight", quantity: 1.5, unitMinor: 101, costMinor: 50 },
    ];
    expect(total(charges)).toBe(152);
    const inv = { charges, issued: true, dueAt: 100 };
    expect(invoiceState(inv, 0, 99)).toBe("Issued");
    expect(invoiceState(inv, 50, 99)).toBe("Partially paid");
    expect(invoiceState(inv, 50, 101)).toBe("Overdue");
    expect(invoiceState(inv, 152, 101)).toBe("Paid");
    expect(invoiceState({ ...inv, issued: false }, 0, 101)).toBe("Draft");
  });
  test("portal projection excludes internal information and other customer records", async () => {
    const { admin } = await setup();
    const d = await admin.query(api.shipping.overview, { now: Date.now() });
    const cid = d.shipments[0].customerId;
    await admin.mutation(api.shipping.addNote, {
      shipmentId: d.shipments[0]._id,
      body: "SECRET-INTERNAL",
      public: false,
    });
    const p = await admin.query(api.shipping.portal, { customerId: cid });
    expect(p.shipments.length).toBeGreaterThan(0);
    for (const s of p.shipments) {
      expect(d.shipments.find((row) => row._id === s.id)?.customerId).toBe(cid);
      expect(s).not.toHaveProperty("charges");
      expect(s).not.toHaveProperty("operator");
      expect(s).not.toHaveProperty("costMinor");
      expect(s.documents.every((doc) => doc.status === "Approved")).toBe(true);
    }
    expect(JSON.stringify(p)).not.toContain("SECRET-INTERNAL");
    expect(JSON.stringify(p)).not.toContain("handling allocation");
    const lookup = await admin.query(api.shipping.portal, {
      customerId: cid,
      reference: "does-not-exist",
    });
    expect(lookup.shipments).toHaveLength(0);
  });
  test("checklist changes and document approvals update readiness records", async () => {
    const { admin } = await setup();
    const d = await admin.query(api.shipping.overview, { now: Date.now() });
    const doc = d.documents.find((doc) => doc.status === "Awaiting approval")!;
    await admin.mutation(api.shipping.saveDocument, {
      id: doc._id,
      shipmentId: doc.shipmentId,
      type: doc.type,
      status: "Approved",
      owner: doc.owner,
      shared: true,
    });
    await admin.mutation(api.shipping.setRequirements, {
      mode: "sea",
      types: ["Commercial invoice", "Insurance certificate"],
    });
    const after = await admin.query(api.shipping.overview, { now: Date.now() });
    expect(after.documents.find((row) => row._id === doc._id)?.status).toBe(
      "Approved",
    );
    expect(after.settings.requirements.sea).toContain("Insurance certificate");
  });
  test("auth, reset isolation and accepted quote snapshots", async () => {
    const { t, admin, uid } = await setup();
    await expect(
      t.query(api.shipping.overview, { now: Date.now() }),
    ).rejects.toThrow("signed in");
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { role: "user", name: "Standard" }),
    );
    const user = t.withIdentity({ subject: `${userId}|session` });
    await expect(
      user.mutation(api.shippingSeed.reset, { confirmation: "RESET SHIPPING" }),
    ).rejects.toThrow("Superadmin");
    await expect(
      user.mutation(api.shipping.setRequirements, {
        mode: "sea",
        types: ["Packing list"],
      }),
    ).rejects.toThrow("Superadmin");
    const legacyId = await t.run((ctx) =>
      ctx.db.insert("records", {
        entityTypeKey: "contact",
        name: "Keep charity",
        fields: {},
        searchText: "keep",
        createdBy: uid,
      }),
    );
    const d = await admin.query(api.shipping.overview, { now: Date.now() });
    const q = d.quotes.find((q) => q.stage === "Won")!;
    const {
      _id,
      _creationTime,
      stage,
      reference,
      createdAt,
      enquiryId,
      ...data
    } = q;
    void _creationTime;
    void stage;
    void reference;
    void createdAt;
    void enquiryId;
    await expect(
      admin.mutation(api.shipping.saveQuote, { id: _id, data }),
    ).rejects.toThrow("locked");
    await expect(
      admin.mutation(api.shippingSeed.reset, { confirmation: "wrong" }),
    ).rejects.toThrow("confirm");
    await admin.mutation(api.shippingSeed.reset, {
      confirmation: "RESET SHIPPING",
    });
    expect(
      await t.run((ctx) => ctx.db.get("records", legacyId)),
    ).not.toBeNull();
    expect(await t.run((ctx) => ctx.db.get("users", uid))).not.toBeNull();
    const after = await admin.query(api.shipping.overview, {
      now: Date.now() + DAY,
    });
    expect(after.shipments).toHaveLength(40);
    expect(after.companies).toHaveLength(16);
  });
});
