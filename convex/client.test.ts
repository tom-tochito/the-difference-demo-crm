/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { test, expect } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.shippingSeed.initialize, {});
  const ids = await t.run(async (ctx) => {
    const companies = await ctx.db.query("shippingCompanies").collect();
    const a = companies.find((c) => c.name === "Alder & Finch Exports")!;
    const b = companies.find((c) => c.name === "Northstar Ceramics")!;
    const su = await ctx.db.insert("users", {
      name: "Platform",
      role: "superadmin",
    });
    const ad = await ctx.db.insert("users", {
      name: "A Admin",
      role: "admin",
      customerId: a._id,
    });
    const bu = await ctx.db.insert("users", {
      name: "B Admin",
      role: "admin",
      customerId: b._id,
    });
    const us = await ctx.db.insert("users", {
      name: "A User",
      role: "user",
      customerId: a._id,
      email: "member@a.example",
    });
    const shipment = await ctx.db
      .query("shippingShipments")
      .withIndex("by_customerId", (q) => q.eq("customerId", a._id))
      .first();
    await ctx.db.insert("shippingAssignments", {
      userId: us,
      customerId: a._id,
      kind: "shipment",
      entityId: shipment!._id,
    });
    return { su, ad, bu, us, a: a._id, b: b._id, shipment: shipment!._id };
  });
  await t.mutation(internal.platform.features, {});
  return {
    t,
    ids,
    superadmin: t.withIdentity({ subject: `${ids.su}|s` }),
    admin: t.withIdentity({ subject: `${ids.ad}|a` }),
    other: t.withIdentity({ subject: `${ids.bu}|b` }),
    user: t.withIdentity({ subject: `${ids.us}|u` }),
  };
}
test("client responses and search enforce company and linked-job assignment, excluding private economics", async () => {
  const { ids, admin, user, other } = await setup();
  const a = await admin.query(api.client.snapshot, {}),
    u = await user.query(api.client.snapshot, {}),
    b = await other.query(api.client.snapshot, {});
  expect(a.shipments.length).toBeGreaterThan(u.shipments.length);
  expect(u.shipments).toHaveLength(1);
  expect(u.quotes).toHaveLength(1);
  expect(b.shipments.some((s) => s._id === ids.shipment)).toBe(false);
  expect(JSON.stringify(a)).not.toMatch(
    /costMinor|supplierMinor|marginMinor|operator|storageId/,
  );
  expect(a.shipments[0].documents).toHaveLength(0);
  await expect(
    other.query(api.client.snapshot, { customerId: ids.a }),
  ).rejects.toThrow("Access denied");
  expect(
    await other.query(api.client.search, { text: "SHP-OCEAN-APPROVAL" }),
  ).toHaveLength(0);
  await expect(
    user.query(api.shipping.overview, { now: Date.now() }),
  ).rejects.toThrow("Superadmin");
  await expect(
    admin.query(api.shipping.portal, { customerId: ids.b }),
  ).rejects.toThrow("Superadmin");
});
test("clients cannot change operational milestones, issue invoices, reset data, or elevate roles", async () => {
  const { ids, admin, user } = await setup();
  await expect(
    admin.mutation(api.shipping.advanceShipment, {
      id: ids.shipment,
      expectedStatus: "Booked",
    }),
  ).rejects.toThrow("Superadmin");
  await expect(
    admin.mutation(api.shipping.createInvoice, { shipmentId: ids.shipment }),
  ).rejects.toThrow("Superadmin");
  await expect(
    admin.mutation(api.shippingSeed.reset, { confirmation: "RESET SHIPPING" }),
  ).rejects.toThrow("Superadmin");
  await expect(user.query(api.platform.team, {})).rejects.toThrow("Admin");
  await expect(
    admin.query(internal.platform.authorizeProvision, {
      customerId: ids.b,
      role: "user",
    }),
  ).rejects.toThrow("Access denied");
  await expect(
    admin.query(internal.platform.authorizeProvision, {
      customerId: ids.a,
      role: "admin",
    }),
  ).rejects.toThrow("Access denied");
});
test("client requests stay assigned, require admin approval and convert idempotently", async () => {
  const { t, ids, admin, user, other, superadmin } = await setup();
  const id = await user.mutation(api.client.submitEnquiry, {
    origin: "Ningbo",
    destination: "Felixstowe",
    cargo: "Fictional components",
    mode: "sea",
    weightKg: 1200,
    volumeM3: 8,
    packages: 8,
    etd: Date.now() + 86400000,
    eta: Date.now() + 35 * 86400000,
    currency: "GBP",
  });
  expect(
    (await user.query(api.client.snapshot, {})).enquiries.some(
      (e) => e._id === id,
    ),
  ).toBe(true);
  expect(
    (await other.query(api.client.snapshot, {})).enquiries.some(
      (e) => e._id === id,
    ),
  ).toBe(false);
  const q = await superadmin.mutation(api.shipping.quoteEnquiry, { id });
  await expect(
    admin.mutation(api.client.acceptQuote, { id: q }),
  ).rejects.toThrow("not been issued");
  await expect(
    superadmin.mutation(api.shipping.setQuoteStage, {
      id: q,
      stage: "Quote Sent",
    }),
  ).rejects.toThrow("Total must be");
  await t.run((ctx) =>
    ctx.db.patch("shippingQuotes", q, {
      charges: [
        {
          description: "Ocean freight",
          quantity: 1,
          unitMinor: 420000,
          costMinor: 350000,
        },
      ],
    }),
  );
  await superadmin.mutation(api.shipping.setQuoteStage, {
    id: q,
    stage: "Quote Sent",
  });
  await expect(
    user.mutation(api.client.acceptQuote, { id: q }),
  ).rejects.toThrow("admin approval");
  await expect(
    other.mutation(api.client.acceptQuote, { id: q }),
  ).rejects.toThrow("Access denied");
  const [b, b2] = await Promise.all([
    admin.mutation(api.client.acceptQuote, { id: q }),
    admin.mutation(api.client.acceptQuote, { id: q }),
  ]);
  expect(b).toBe(b2);
  await superadmin.mutation(api.shipping.confirmBooking, { id: b });
  const shipment = await superadmin.mutation(api.shipping.planShipment, {
    id: b,
  });
  const invoice = await superadmin.mutation(api.shipping.createInvoice, {
    shipmentId: shipment,
  });
  const draft = await user.query(api.client.snapshot, {});
  expect(draft.invoices.some((i) => i._id === invoice)).toBe(false);
  await superadmin.mutation(api.shipping.issueInvoice, { id: invoice });
  const visible = await user.query(api.client.snapshot, {});
  expect(visible.shipments.find((s) => s._id === shipment)?.bookingId).toBe(b);
  expect(visible.bookings.find((booking) => booking._id === b)?.quoteId).toBe(
    q,
  );
  expect(visible.invoices.find((i) => i._id === invoice)?.shipmentId).toBe(
    shipment,
  );
  const preview = await superadmin.query(api.client.snapshot, {
    customerId: ids.a,
  });
  expect(preview.shipments.some((s) => s._id === shipment)).toBe(true);
  expect(JSON.stringify(preview)).not.toMatch(
    /costMinor|supplierMinor|marginMinor|operator|storageId/,
  );
  expect(
    (await other.query(api.client.snapshot, {})).invoices.some(
      (i) => i._id === invoice,
    ),
  ).toBe(false);
  expect(
    (await t.run((ctx) => ctx.db.get("shippingBookings", b)))?.customerId,
  ).toBe(ids.a);
});

test("source refresh is superadmin-only and idempotent without changing operational records", async () => {
  const { t, user, admin, superadmin } = await setup();
  const sources = await user.query(api.dataSources.sources, {});
  expect(sources).toHaveLength(5);
  const before = await t.run((ctx) =>
    ctx.db.query("shippingBookings").collect(),
  );
  const args = { id: sources[0]._id, expectedRevision: sources[0].revision };
  await expect(admin.mutation(api.dataSources.refresh, args)).rejects.toThrow(
    "Superadmin",
  );
  await expect(user.mutation(api.dataSources.refresh, args)).rejects.toThrow(
    "Superadmin",
  );
  const results = await Promise.all([
    superadmin.mutation(api.dataSources.refresh, args),
    superadmin.mutation(api.dataSources.refresh, args),
  ]);
  expect(results).toEqual([
    args.expectedRevision + 1,
    args.expectedRevision + 1,
  ]);
  expect(
    await t.run((ctx) => ctx.db.query("shippingBookings").collect()),
  ).toEqual(before);
  expect(
    await t.run((ctx) => ctx.db.query("shippingSourceEvents").collect()),
  ).toHaveLength(1);
});
test("assignment changes and disabled accounts immediately affect access", async () => {
  const { ids, user, admin, other } = await setup();
  await expect(
    other.mutation(api.platform.assign, {
      userId: ids.us,
      kind: "shipment",
      entityId: ids.shipment,
      assigned: true,
    }),
  ).rejects.toThrow("Access denied");
  await admin.mutation(api.platform.assign, {
    userId: ids.us,
    kind: "shipment",
    entityId: ids.shipment,
    assigned: false,
  });
  expect((await user.query(api.client.snapshot, {})).shipments).toHaveLength(0);
  await admin.mutation(api.platform.setDisabled, {
    id: ids.us,
    disabled: true,
  });
  await expect(user.query(api.client.snapshot, {})).rejects.toThrow(
    "User record",
  );
  await expect(
    admin.mutation(api.platform.setDisabled, { id: ids.ad, disabled: true }),
  ).rejects.toThrow("cannot change");
});
test("client uploads require a valid job and a single-use owned upload grant", async () => {
  const { t, ids, user, other, superadmin } = await setup();
  await expect(
    other.mutation(api.client.beginUpload, {
      shipmentId: ids.shipment,
      type: "Packing list",
    }),
  ).rejects.toThrow("Access denied");
  const grant = await user.mutation(api.client.beginUpload, {
    shipmentId: ids.shipment,
    type: "Packing list",
  });
  const file = await t.run((ctx) =>
    ctx.storage.store(new Blob(["demo"], { type: "text/plain" })),
  );
  await expect(
    other.mutation(api.client.finishUpload, {
      grantId: grant.grantId,
      storageId: file,
      filename: "sample.txt",
    }),
  ).rejects.toThrow("unavailable");
  await user.mutation(api.client.finishUpload, {
    grantId: grant.grantId,
    storageId: file,
    filename: "sample.txt",
  });
  await expect(
    user.mutation(api.client.finishUpload, {
      grantId: grant.grantId,
      storageId: file,
      filename: "sample.txt",
    }),
  ).rejects.toThrow("unavailable");
  const docs = (await user.query(api.client.snapshot, {})).shipments[0]
    .documents;
  expect(docs[0].status).toBe("Awaiting approval");
  await expect(
    user.query(api.shipping.documentUrl, { id: docs[0]._id }),
  ).rejects.toThrow("Superadmin");
  const d = (
    await superadmin.query(api.shipping.overview, { now: Date.now() })
  ).documents.find((d) => d._id === docs[0]._id)!;
  await superadmin.mutation(api.shipping.saveDocument, {
    id: d._id,
    shipmentId: d.shipmentId,
    type: d.type,
    status: "Approved",
    owner: d.owner,
    shared: true,
  });
  expect(
    (await user.query(api.client.snapshot, {})).shipments[0].documents[0]
      .status,
  ).toBe("Approved");
});
test("reset preserves user identities, rebinds companies and restores isolated demo features", async () => {
  const { ids, t, superadmin, user } = await setup();
  await superadmin.mutation(api.shippingSeed.reset, {
    confirmation: "RESET SHIPPING",
  });
  const u = await t.run((ctx) => ctx.db.get("users", ids.us));
  expect(u?.customerId).not.toBe(ids.a);
  expect((await user.query(api.client.snapshot, {})).company.name).toBe(
    "Alder & Finch Exports",
  );
  expect(await user.query(api.dataSources.sources, {})).toHaveLength(5);
  await t.mutation(internal.platform.features, {});
  expect(await user.query(api.dataSources.sources, {})).toHaveLength(5);
  expect(
    await t.run((ctx) => ctx.db.query("shippingScenarios").collect()),
  ).toHaveLength(0);
});

test("ordinary feature initialization preserves deliberately removed assignments", async () => {
  const { t, ids, admin, user } = await setup();
  await admin.mutation(api.platform.assign, {
    userId: ids.us,
    kind: "shipment",
    entityId: ids.shipment,
    assigned: false,
  });
  await t.mutation(internal.platform.features, {});
  expect((await user.query(api.client.snapshot, {})).shipments).toHaveLength(0);
});
test("migration corrects impossible future actual milestones without changing planned dates", async () => {
  const { t, ids } = await setup();
  const original = await t.run(async (ctx) => {
    const s = (await ctx.db.get("shippingShipments", ids.shipment))!;
    await ctx.db.patch("shippingShipments", s._id, {
      milestones: s.milestones.map((m, i) =>
        i === 0 ? { ...m, actual: Date.now() + 86400000 } : m,
      ),
    });
    const marker = await ctx.db
      .query("platformMigrations")
      .withIndex("by_key", (q) => q.eq("key", "actual-milestones-v2"))
      .unique();
    if (marker) await ctx.db.delete("platformMigrations", marker._id);
    return s;
  });
  await t.mutation(internal.platform.features, {});
  await t.mutation(internal.platform.features, {});
  const result = await t.run((ctx) =>
    ctx.db.get("shippingShipments", ids.shipment),
  );
  expect(result?.milestones.map((m) => m.planned)).toEqual(
    original.milestones.map((m) => m.planned),
  );
  expect(result?.milestones[0].actual).toBeLessThanOrEqual(Date.now());
});
