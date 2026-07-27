"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntityFields } from "../hooks/use-entity-fields";
import { FieldRenderer } from "./field-renderer";

/**
 * Renders every field group for a record as key–value panels, driven by
 * the admin-managed field definitions (order, grouping, labels).
 */
export function RecordDetailGroups({
  entityTypeKey,
  fields,
  relationNames,
  excludeGroups = [],
}: {
  entityTypeKey: string;
  fields: Record<string, unknown>;
  relationNames?: Record<string, string>;
  excludeGroups?: Array<string>;
}) {
  const { groups } = useEntityFields(entityTypeKey);
  const hasValue = (key: string) => {
    const value = fields[key];
    return value !== undefined && value !== null && value !== "";
  };
  const visible = groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((def) => hasValue(def.key)),
    }))
    .filter(
      (group) => !excludeGroups.includes(group.name) && group.fields.length > 0,
    );
  return (
    <>
      {visible.map((group) => (
        <Card key={group.name} className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">{group.name}</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <dl className="space-y-2">
              {group.fields.map((def) => (
                <div
                  key={def._id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <dt className="shrink-0 text-zinc-500">{def.label}</dt>
                  <dd className="text-right font-medium text-zinc-900">
                    <FieldRenderer
                      def={def}
                      value={fields[def.key]}
                      relationName={relationNames?.[def.key]}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
