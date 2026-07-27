"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEntityFields, type FieldDef } from "../hooks/use-entity-fields";
import { FieldInput } from "./field-input";

// Fields that comfortably share a row on wider screens.
const COMPACT_TYPES = new Set([
  "text",
  "number",
  "currency",
  "date",
  "select",
  "email",
  "url",
  "relation",
]);

/**
 * Dynamic create/edit form — the fields and their grouping come entirely
 * from the admin-managed field definitions for the entity type.
 */
export function RecordFormDialog({
  entityTypeKey,
  entityLabel,
  record,
  open,
  onOpenChange,
  onSaved,
}: {
  entityTypeKey: string;
  entityLabel: string;
  record?: Doc<"records"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (id: Id<"records">) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {open && (
          <FormBody
            key={record?._id ?? "new"}
            entityTypeKey={entityTypeKey}
            entityLabel={entityLabel}
            record={record}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  entityTypeKey,
  entityLabel,
  record,
  onOpenChange,
  onSaved,
}: {
  entityTypeKey: string;
  entityLabel: string;
  record?: Doc<"records"> | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: (id: Id<"records">) => void;
}) {
  const { defs, isLoading } = useEntityFields(entityTypeKey);
  const create = useMutation(api.records.create);
  const update = useMutation(api.records.update);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    record ? { ...record.fields } : {},
  );
  const [saving, setSaving] = useState(false);

  // Name field pinned first, then sections in field-definition order.
  const sections = useMemo(() => {
    const nameDef = defs.find((def) => def.systemMapping === "name");
    const grouped: Array<{ name: string; fields: Array<FieldDef> }> = [];
    for (const def of defs) {
      if (def.systemMapping === "name") continue;
      const groupName = def.group ?? "Details";
      let section = grouped.find((g) => g.name === groupName);
      if (!section) {
        section = { name: groupName, fields: [] };
        grouped.push(section);
      }
      section.fields.push(def);
    }
    return { nameDef, grouped };
  }, [defs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (record) {
        await update({ id: record._id, fields: values });
        toast.success(`${entityLabel} updated`);
        onSaved?.(record._id);
      } else {
        const id = await create({ entityTypeKey, fields: values });
        toast.success(`${entityLabel} created`);
        onSaved?.(id);
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error && "data" in error
          ? String((error as { data: unknown }).data)
          : "Could not save.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (def: FieldDef) => (
    <div
      key={def._id}
      className={cn(
        "grid content-start gap-1.5",
        !COMPACT_TYPES.has(def.type) && "sm:col-span-2",
      )}
    >
      <Label className="text-xs font-medium text-zinc-600">
        {def.label}
        {def.required && <span className="text-red-500">*</span>}
      </Label>
      <FieldInput
        def={def}
        value={values[def.key]}
        onChange={(value) =>
          setValues((prev) => ({ ...prev, [def.key]: value }))
        }
      />
    </div>
  );

  return (
    <>
      <DialogHeader className="border-b border-zinc-100 px-6 pb-4 pt-6">
        <DialogTitle>
          {record
            ? `Edit ${entityLabel.toLowerCase()}`
            : `Add ${entityLabel.toLowerCase()}`}
        </DialogTitle>
        <DialogDescription>
          {record
            ? `Update the fields on ${record.name}.`
            : `Fields are defined by your admin and can be changed at any time.`}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        ) : (
          <div className="space-y-5">
            {sections.nameDef && (
              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-zinc-600">
                  {sections.nameDef.label}
                  <span className="text-red-500">*</span>
                </Label>
                <FieldInput
                  def={sections.nameDef}
                  value={values[sections.nameDef.key]}
                  onChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      [sections.nameDef!.key]: value,
                    }))
                  }
                />
              </div>
            )}
            {sections.grouped.map((section) => (
              <fieldset key={section.name}>
                <legend className="mb-2.5 flex w-full items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                  {section.name}
                  <span className="h-px flex-1 bg-zinc-100" />
                </legend>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {section.fields.map(renderField)}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || isLoading}>
          {saving ? "Saving…" : record ? "Save changes" : `Create ${entityLabel.toLowerCase()}`}
        </Button>
      </div>
    </>
  );
}
