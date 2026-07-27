import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * Validates a raw `fields` payload against the entity type's field
 * definitions, drops unknown keys, and derives the promoted (indexed)
 * columns declared via `systemMapping`. This is the single write path
 * for records — nothing else may shape record documents.
 */
export async function buildRecordPatch(
  ctx: MutationCtx,
  defs: Array<Doc<"fieldDefs">>,
  rawFields: Record<string, unknown>,
): Promise<{
  fields: Record<string, unknown>;
  name: string;
  searchText: string;
  stage: string | undefined;
  status: string | undefined;
  amountMinor: number | undefined;
  dueAt: number | undefined;
  parentId: Id<"records"> | undefined;
}> {
  const fields: Record<string, unknown> = {};
  let name = "Untitled";
  let stage: string | undefined;
  let status: string | undefined;
  let amountMinor: number | undefined;
  let dueAt: number | undefined;
  let parentId: Id<"records"> | undefined;
  const searchParts: Array<string> = [];

  for (const def of defs) {
    const raw = rawFields[def.key];
    if (raw === undefined || raw === null || raw === "") {
      if (def.required) {
        throw new ConvexError(`"${def.label}" is required.`);
      }
      continue;
    }
    const value = await validateFieldValue(ctx, def, raw);
    fields[def.key] = value;

    if (def.searchable && typeof value === "string") {
      searchParts.push(value);
    }
    if (def.searchable && Array.isArray(value)) {
      searchParts.push(value.join(" "));
    }

    switch (def.systemMapping) {
      case "name":
        name = String(value);
        break;
      case "stage":
        stage = String(value);
        break;
      case "status":
        status = String(value);
        break;
      case "amountMinor":
        amountMinor = value as number;
        break;
      case "dueAt":
        dueAt = value as number;
        break;
      case "parentId":
        parentId = value as Id<"records">;
        break;
    }
  }

  const searchText = [name, ...searchParts].join(" ").toLowerCase();
  return { fields, name, searchText, stage, status, amountMinor, dueAt, parentId };
}

async function validateFieldValue(
  ctx: MutationCtx,
  def: Doc<"fieldDefs">,
  value: unknown,
): Promise<unknown> {
  switch (def.type) {
    case "text":
    case "textarea":
    case "url":
    case "email":
      if (typeof value !== "string") {
        throw new ConvexError(`"${def.label}" must be text.`);
      }
      return value;
    case "number":
    case "currency":
    case "date":
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new ConvexError(`"${def.label}" must be a number.`);
      }
      return value;
    case "select":
      if (typeof value !== "string") {
        throw new ConvexError(`"${def.label}" must be a string.`);
      }
      if (def.options && def.options.length > 0 && !def.options.includes(value)) {
        throw new ConvexError(
          `"${value}" is not a valid option for "${def.label}".`,
        );
      }
      return value;
    case "multiselect":
      if (!Array.isArray(value) || value.some((x) => typeof x !== "string")) {
        throw new ConvexError(`"${def.label}" must be a list of strings.`);
      }
      return value;
    case "relation": {
      const id = ctx.db.normalizeId("records", String(value));
      if (id === null) {
        throw new ConvexError(`"${def.label}" must reference a record.`);
      }
      const target = await ctx.db.get("records", id);
      if (target === null) {
        throw new ConvexError(`"${def.label}" references a missing record.`);
      }
      if (def.relationTo && target.entityTypeKey !== def.relationTo) {
        throw new ConvexError(
          `"${def.label}" must reference a ${def.relationTo} record.`,
        );
      }
      return id;
    }
  }
}
