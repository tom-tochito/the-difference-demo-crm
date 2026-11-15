import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  companyV,
  quoteV,
  shipmentFields,
  milestoneV,
  stageV,
  chargeV,
  documentTypeV,
  docStatusV,
} from "./shippingModel";
import { authTables } from "@convex-dev/auth/server";

export const fieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("textarea"),
  v.literal("number"),
  v.literal("currency"),
  v.literal("date"),
  v.literal("select"),
  v.literal("multiselect"),
  v.literal("relation"),
  v.literal("url"),
  v.literal("email"),
);

export const systemMappingValidator = v.union(
  v.literal("name"),
  v.literal("stage"),
  v.literal("status"),
  v.literal("amountMinor"),
  v.literal("dueAt"),
  v.literal("parentId"),
);

export const roleValidator = v.union(
  v.literal("superadmin"),
  v.literal("admin"),
  v.literal("user"),
);

export default defineSchema({
  ...authTables,
  shippingAssignments: defineTable({
    customerId: v.id("shippingCompanies"),
    userId: v.id("users"),
    entityId: v.string(),
    kind: v.union(
      v.literal("shipment"),
      v.literal("enquiry"),
      v.literal("quote"),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_customer", ["customerId"]),
  shippingUploadGrants: defineTable({
    userId: v.id("users"),
    documentId: v.id("shippingDocuments"),
    expiresAt: v.number(),
    used: v.boolean(),
  }).index("by_user", ["userId"]),
  shippingSources: defineTable({
    key: v.string(),
    name: v.string(),
    category: v.string(),
    coverage: v.string(),
    provenance: v.string(),
    observedAt: v.number(),
    validUntil: v.number(),
    revision: v.number(),
  }).index("by_key", ["key"]),
  shippingSourceEvents: defineTable({
    sourceId: v.id("shippingSources"),
    happenedAt: v.number(),
    revision: v.number(),
    message: v.string(),
  }).index("by_source", ["sourceId"]),
  shippingScenarios: defineTable({
    key: v.string(),
    customerId: v.id("shippingCompanies"),
    title: v.string(),
    description: v.string(),
    origin: v.string(),
    destination: v.string(),
    cargo: v.string(),
    currency: v.union(v.literal("GBP"), v.literal("EUR"), v.literal("USD")),
    sourceId: v.id("shippingSources"),
    baseline: v.array(v.object({ label: v.string(), amountMinor: v.number() })),
    options: v.array(
      v.object({
        label: v.string(),
        mode: v.union(v.literal("sea"), v.literal("air"), v.literal("road")),
        days: v.number(),
        freightMinor: v.number(),
        handlingMinor: v.number(),
        feeMinor: v.number(),
        supplierMinor: v.number(),
      }),
    ),
  })
    .index("by_customer", ["customerId"])
    .index("by_key", ["key"]),
  shippingComparisons: defineTable({
    customerId: v.id("shippingCompanies"),
    scenarioId: v.id("shippingScenarios"),
    optionIndex: v.number(),
    enquiryId: v.id("shippingEnquiries"),
    baselineMinor: v.number(),
    priceMinor: v.number(),
    savingMinor: v.number(),
    currency: v.string(),
    sourceRevision: v.number(),
    observedAt: v.number(),
    requestedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_enquiry", ["enquiryId"]),
  platformMigrations: defineTable({
    key: v.string(),
    completedAt: v.number(),
    detail: v.string(),
  }).index("by_key", ["key"]),
  shippingCompanies: defineTable(companyV).index("by_name", ["name"]),
  shippingContacts: defineTable({
    customerId: v.id("shippingCompanies"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    title: v.string(),
  }).index("by_customerId", ["customerId"]),
  shippingEnquiries: defineTable({
    ...quoteV.fields,
    reference: v.string(),
    stage: stageV,
    createdAt: v.number(),
  }).index("by_customerId", ["customerId"]),
  shippingQuotes: defineTable({
    ...quoteV.fields,
    reference: v.string(),
    enquiryId: v.optional(v.id("shippingEnquiries")),
    stage: stageV,
    createdAt: v.number(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_enquiryId", ["enquiryId"]),
  shippingBookings: defineTable({
    ...quoteV.fields,
    reference: v.string(),
    quoteId: v.optional(v.id("shippingQuotes")),
    confirmed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_quoteId", ["quoteId"])
    .index("by_customerId", ["customerId"]),
  shippingShipments: defineTable({
    ...shipmentFields,
    reference: v.string(),
    bookingId: v.optional(v.id("shippingBookings")),
    status: v.string(),
    milestones: v.array(milestoneV),
    charges: v.array(chargeV),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_bookingId", ["bookingId"])
    .index("by_customerId", ["customerId"])
    .index("by_status_and_etd", ["status", "etd"])
    .index("by_reference", ["reference"]),
  shippingDocuments: defineTable({
    shipmentId: v.id("shippingShipments"),
    type: documentTypeV,
    status: docStatusV,
    owner: v.string(),
    shared: v.boolean(),
    updatedAt: v.number(),
    storageId: v.optional(v.id("_storage")),
    filename: v.optional(v.string()),
  })
    .index("by_shipmentId", ["shipmentId"])
    .index("by_storageId", ["storageId"]),
  shippingTasks: defineTable({
    customerId: v.optional(v.id("shippingCompanies")),
    shipmentId: v.optional(v.id("shippingShipments")),
    title: v.string(),
    assignee: v.string(),
    priority: v.union(v.literal("Low"), v.literal("Normal"), v.literal("High")),
    dueAt: v.number(),
    assignedUserId: v.optional(v.id("users")),
    done: v.boolean(),
    resolution: v.string(),
  })
    .index("by_shipmentId", ["shipmentId"])
    .index("by_done_and_dueAt", ["done", "dueAt"])
    .index("by_customerId", ["customerId"]),
  shippingExceptions: defineTable({
    shipmentId: v.id("shippingShipments"),
    title: v.string(),
    resolved: v.boolean(),
    resolution: v.string(),
    createdAt: v.number(),
  }).index("by_shipmentId", ["shipmentId"]),
  shippingActivities: defineTable({
    customerId: v.optional(v.id("shippingCompanies")),
    shipmentId: v.optional(v.id("shippingShipments")),
    body: v.string(),
    public: v.boolean(),
    author: v.string(),
    happenedAt: v.number(),
  })
    .index("by_shipmentId", ["shipmentId"])
    .index("by_customerId", ["customerId"])
    .index("by_happenedAt", ["happenedAt"]),
  shippingInvoices: defineTable({
    customerId: v.id("shippingCompanies"),
    shipmentId: v.id("shippingShipments"),
    reference: v.string(),
    currency: v.union(v.literal("GBP"), v.literal("EUR"), v.literal("USD")),
    charges: v.array(chargeV),
    issued: v.boolean(),
    dueAt: v.number(),
    issuedAt: v.optional(v.number()),
  })
    .index("by_shipmentId", ["shipmentId"])
    .index("by_customerId", ["customerId"]),
  shippingPayments: defineTable({
    invoiceId: v.id("shippingInvoices"),
    amountMinor: v.number(),
    receivedAt: v.number(),
    reference: v.string(),
    requestId: v.string(),
  })
    .index("by_invoiceId", ["invoiceId"])
    .index("by_requestId", ["requestId"]),
  shippingSettings: defineTable({
    key: v.string(),
    seedVersion: v.number(),
    seededAt: v.number(),
    nextSequence: v.number(),
    requirements: v.object({
      sea: v.array(documentTypeV),
      air: v.array(documentTypeV),
      road: v.array(documentTypeV),
    }),
  }).index("by_key", ["key"]),
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(roleValidator),
    customerId: v.optional(v.id("shippingCompanies")),
    disabled: v.optional(v.boolean()),
    team: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_customer", ["customerId"]),

  entityTypes: defineTable({
    key: v.string(),
    label: v.string(),
    labelPlural: v.string(),
    isSystem: v.boolean(),
  }).index("by_key", ["key"]),

  fieldDefs: defineTable({
    entityTypeKey: v.string(),
    key: v.string(),
    label: v.string(),
    type: fieldTypeValidator,
    options: v.optional(v.array(v.string())),
    relationTo: v.optional(v.string()),
    required: v.boolean(),
    searchable: v.boolean(),
    showInList: v.boolean(),
    group: v.optional(v.string()),
    order: v.number(),
    systemMapping: v.optional(systemMappingValidator),
  })
    .index("by_entityTypeKey_and_order", ["entityTypeKey", "order"])
    .index("by_entityTypeKey_and_key", ["entityTypeKey", "key"]),

  records: defineTable({
    entityTypeKey: v.string(),
    name: v.string(),
    fields: v.record(v.string(), v.any()),
    searchText: v.string(),
    parentId: v.optional(v.id("records")),
    stage: v.optional(v.string()),
    status: v.optional(v.string()),
    amountMinor: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    flagged: v.optional(v.boolean()),
    restricted: v.optional(v.boolean()),
    createdBy: v.id("users"),
  })
    .index("by_entityTypeKey", ["entityTypeKey"])
    .index("by_entityTypeKey_and_parentId", ["entityTypeKey", "parentId"])
    .index("by_entityTypeKey_and_stage", ["entityTypeKey", "stage"])
    .index("by_entityTypeKey_and_dueAt", ["entityTypeKey", "dueAt"])
    .index("by_entityTypeKey_and_flagged", ["entityTypeKey", "flagged"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["entityTypeKey"],
    }),

  activities: defineTable({
    recordId: v.optional(v.id("records")),
    kind: v.string(),
    body: v.string(),
    detail: v.optional(v.string()),
    team: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    happenedAt: v.number(),
  })
    .index("by_recordId_and_happenedAt", ["recordId", "happenedAt"])
    .index("by_happenedAt", ["happenedAt"]),

  tasks: defineTable({
    title: v.string(),
    recordId: v.optional(v.id("records")),
    recordName: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    team: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    done: v.boolean(),
  }).index("by_done_and_dueAt", ["done", "dueAt"]),

  targets: defineTable({
    financialYear: v.string(),
    targetMinor: v.number(),
  }).index("by_financialYear", ["financialYear"]),
});
