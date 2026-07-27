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
  DialogDescription,
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
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
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

  const flagRows = [
    {
      label: "Required",
      hint: "Value must be provided on every record",
      checked: required,
      set: setRequired,
    },
    {
      label: "Searchable",
      hint: "Folded into full-text search and ⌘K results",
      checked: searchable,
      set: setSearchable,
    },
    {
      label: "Show in list",
      hint: "Appears as a column/badge in list panels",
      checked: showInList,
      set: setShowInList,
    },
  ];

  return (
    <>
      <DialogHeader className="border-b border-zinc-100 px-6 pb-4 pt-6">
        <DialogTitle>
          {field ? `Edit field: ${field.label}` : "Add field"}
        </DialogTitle>
        <DialogDescription>
          Changes apply instantly to forms, lists and detail panels for every
          user.
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <section>
          <SectionHeading>Basics</SectionHeading>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label className="text-xs font-medium text-zinc-600">Label</Label>
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
            <div className="grid content-start gap-1.5">
              <Label className="text-xs font-medium text-zinc-600">
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
            <div className="grid content-start gap-1.5">
              <Label className="text-xs font-medium text-zinc-600">
                Detail panel group
              </Label>
              <Input value={group} onChange={(e) => setGroup(e.target.value)} />
            </div>
          </div>
        </section>

        <section>
          <SectionHeading>Type</SectionHeading>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label className="text-xs font-medium text-zinc-600">
                Field type
              </Label>
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
            {type === "relation" && (
              <div className="grid content-start gap-1.5">
                <Label className="text-xs font-medium text-zinc-600">
                  Relates to
                </Label>
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
            {needsOptions && (
              <div className="grid content-start gap-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-zinc-600">
                  Options (one per line)
                </Label>
                <Textarea
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionHeading>Behaviour</SectionHeading>
          <div className="space-y-2">
            {flagRows.map((flag) => (
              <Label
                key={flag.label}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 has-[[data-state=checked]]:border-indigo-300 has-[[data-state=checked]]:bg-indigo-50/50"
              >
                <Checkbox
                  checked={flag.checked}
                  onCheckedChange={(c) => flag.set(c === true)}
                  className="mt-0.5"
                />
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium text-zinc-900">
                    {flag.label}
                  </span>
                  <span className="text-xs font-normal text-zinc-500">
                    {flag.hint}
                  </span>
                </span>
              </Label>
            ))}
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || label === "" || key === ""}
        >
          {saving ? "Saving…" : "Save field"}
        </Button>
      </div>
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
      {children}
      <span className="h-px flex-1 bg-zinc-100" />
    </p>
  );
}
