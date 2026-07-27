"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "currency",
  "date",
  "select",
  "multiselect",
  "relation",
  "url",
  "email",
] as const;

type FieldType = (typeof FIELD_TYPES)[number];

export function FieldEditorDialog({
  entityTypeKey,
  entityTypes,
  field,
  open,
  onOpenChange,
}: {
  entityTypeKey: string;
  entityTypes: Array<Doc<"entityTypes">>;
  field: Doc<"fieldDefs"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        {open && (
          <EditorBody
            key={field?._id ?? "new"}
            entityTypeKey={entityTypeKey}
            entityTypes={entityTypes}
            field={field}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditorBody({
  entityTypeKey,
  entityTypes,
  field,
  onOpenChange,
}: {
  entityTypeKey: string;
  entityTypes: Array<Doc<"entityTypes">>;
  field: Doc<"fieldDefs"> | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createField = useMutation(api.entityFields.createField);
  const updateField = useMutation(api.entityFields.updateField);

  const [label, setLabel] = useState(field?.label ?? "");
  const [key, setKey] = useState(field?.key ?? "");
  const [type, setType] = useState<FieldType>(field?.type ?? "text");
  const [options, setOptions] = useState((field?.options ?? []).join("\n"));
  const [relationTo, setRelationTo] = useState(
    field?.relationTo ?? "organisation",
  );
  const [group, setGroup] = useState(field?.group ?? "Details");
  const [required, setRequired] = useState(field?.required ?? false);
  const [searchable, setSearchable] = useState(field?.searchable ?? false);
  const [showInList, setShowInList] = useState(field?.showInList ?? false);
  const [saving, setSaving] = useState(false);

  const needsOptions = type === "select" || type === "multiselect";

  const handleSave = async () => {
    setSaving(true);
    const parsedOptions = needsOptions
      ? options
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;
    try {
      if (field) {
        await updateField({
          id: field._id,
          label,
          type,
          options: parsedOptions,
          relationTo: type === "relation" ? relationTo : undefined,
          group,
          required,
          searchable,
          showInList,
        });
        toast.success("Field updated");
      } else {
        await createField({
          entityTypeKey,
          key,
          label,
          type,
          options: parsedOptions,
          relationTo: type === "relation" ? relationTo : undefined,
          group,
          required,
          searchable,
          showInList,
        });
        toast.success("Field created");
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error && "data" in error
          ? String((error as { data: unknown }).data)
          : "Could not save field.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{field ? `Edit field: ${field.label}` : "Add field"}</DialogTitle>
      </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Label</Label>
            <Input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (!field) {
                  const slug = e.target.value
                    .replace(/[^a-zA-Z0-9 ]/g, "")
                    .trim()
                    .split(/\s+/)
                    .map((word, i) =>
                      i === 0
                        ? word.toLowerCase()
                        : word[0]?.toUpperCase() + word.slice(1).toLowerCase(),
                    )
                    .join("");
                  setKey(slug);
                }
              }}
              placeholder="e.g. Twitter handle"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">
              Key {field && <span className="text-zinc-400">(fixed)</span>}
            </Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={field !== null}
              placeholder="twitterHandle"
              className="font-mono text-xs"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field && field.type !== type && (
              <p className="text-xs text-amber-600">
                Changing type does not migrate existing values.
              </p>
            )}
          </div>
          {needsOptions && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Options (one per line)</Label>
              <Textarea
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                rows={4}
              />
            </div>
          )}
          {type === "relation" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Relates to</Label>
              <Select value={relationTo} onValueChange={setRelationTo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entityTypes.map((entityType) => (
                    <SelectItem key={entityType.key} value={entityType.key}>
                      {entityType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label className="text-xs">Detail panel group</Label>
            <Input value={group} onChange={(e) => setGroup(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <Label className="flex items-center gap-2 text-xs font-normal">
              <Checkbox
                checked={required}
                onCheckedChange={(c) => setRequired(c === true)}
              />
              Required
            </Label>
            <Label className="flex items-center gap-2 text-xs font-normal">
              <Checkbox
                checked={searchable}
                onCheckedChange={(c) => setSearchable(c === true)}
              />
              Searchable
            </Label>
            <Label className="flex items-center gap-2 text-xs font-normal">
              <Checkbox
                checked={showInList}
                onCheckedChange={(c) => setShowInList(c === true)}
              />
              Show in list
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || label === "" || key === ""}
          >
            {saving ? "Saving…" : "Save field"}
          </Button>
        </DialogFooter>
    </>
  );
}
