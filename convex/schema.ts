import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
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

export const roleValidator = v.union(v.literal("admin"), v.literal("user"));

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(roleValidator),
    team: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

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
