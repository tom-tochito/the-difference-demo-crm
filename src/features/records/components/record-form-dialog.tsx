"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEntityFields } from "../hooks/use-entity-fields";
import { FieldInput } from "./field-input";

/**
 * Dynamic create/edit form — the fields it renders come entirely from the
 * admin-managed field definitions for the entity type.
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {record ? `Edit ${entityLabel.toLowerCase()}` : `Add ${entityLabel.toLowerCase()}`}
        </DialogTitle>
      </DialogHeader>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Loading fields…</p>
      ) : (
        <div className="grid gap-4 py-2">
          {defs.map((def) => (
            <div key={def._id} className="grid gap-1.5">
              <Label className="text-xs text-zinc-600">
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
          ))}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || isLoading}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
