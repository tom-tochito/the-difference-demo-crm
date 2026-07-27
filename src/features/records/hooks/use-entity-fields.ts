"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

export type FieldDef = Doc<"fieldDefs">;

export function useEntityFields(entityTypeKey: string) {
  const defs = useQuery(api.entityFields.listFields, { entityTypeKey });
  return useMemo(() => {
    const all = defs ?? [];
    const byKey = new Map(all.map((def) => [def.key, def]));
    const listFields = all.filter((def) => def.showInList);
    const groups: Array<{ name: string; fields: Array<FieldDef> }> = [];
    for (const def of all) {
      if (def.systemMapping === "name") continue;
      const groupName = def.group ?? "Details";
      let group = groups.find((g) => g.name === groupName);
      if (!group) {
        group = { name: groupName, fields: [] };
        groups.push(group);
      }
      group.fields.push(def);
    }
    return { defs: all, byKey, listFields, groups, isLoading: defs === undefined };
  }, [defs]);
}
