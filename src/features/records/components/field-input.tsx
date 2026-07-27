"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldDef } from "../hooks/use-entity-fields";

const NONE = "__none__";

/** Edit-mode input for a single dynamic field value. */
export function FieldInput({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (def.type) {
    case "textarea":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
          rows={3}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      );
    case "currency":
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
            £
          </span>
          <Input
            type="number"
            className="pl-7"
            value={
              value === undefined || value === null
                ? ""
                : String((value as number) / 100)
            }
            onChange={(e) =>
              onChange(
                e.target.value === ""
                  ? undefined
                  : Math.round(Number(e.target.value) * 100),
              )
            }
          />
        </div>
      );
    case "date": {
      const iso =
        typeof value === "number"
          ? new Date(value).toISOString().slice(0, 10)
          : "";
      return (
        <Input
          type="date"
          value={iso}
          onChange={(e) =>
            onChange(
              e.target.value === ""
                ? undefined
                : new Date(`${e.target.value}T12:00:00Z`).getTime(),
            )
          }
        />
      );
    }
    case "select":
      return (
        <Select
          value={(value as string) ?? NONE}
          onValueChange={(next) => onChange(next === NONE ? undefined : next)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {!def.required && <SelectItem value={NONE}>—</SelectItem>}
            {(def.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multiselect": {
      const selected = new Set((value as Array<string>) ?? []);
      return (
        <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-md border border-zinc-200 p-2">
          {(def.options ?? []).map((option) => (
            <Label
              key={option}
              className="flex items-center gap-2 text-xs font-normal"
            >
              <Checkbox
                checked={selected.has(option)}
                onCheckedChange={(checked) => {
                  const next = new Set(selected);
                  if (checked === true) next.add(option);
                  else next.delete(option);
                  onChange(next.size === 0 ? undefined : [...next]);
                }}
              />
              {option}
            </Label>
          ))}
        </div>
      );
    }
    case "relation":
      return (
        <RelationInput
          relationTo={def.relationTo ?? "organisation"}
          value={value as string | undefined}
          required={def.required}
          onChange={onChange}
        />
      );
    default:
      return (
        <Input
          type={def.type === "email" ? "email" : def.type === "url" ? "url" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        />
      );
  }
}

function RelationInput({
  relationTo,
  value,
  required,
  onChange,
}: {
  relationTo: string;
  value: string | undefined;
  required: boolean;
  onChange: (value: unknown) => void;
}) {
  const result = useQuery(api.records.list, {
    entityTypeKey: relationTo,
    paginationOpts: { numItems: 200, cursor: null },
  });
  const options = [...(result?.page ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) => onChange(next === NONE ? undefined : next)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {!required && <SelectItem value={NONE}>—</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option._id} value={option._id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
