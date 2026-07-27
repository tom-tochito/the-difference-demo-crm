"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldEditorDialog } from "@/features/admin-fields/components/field-editor-dialog";
import { BadgePill } from "@/features/records/components/badge-pill";

export default function AdminFieldsPage() {
  const user = useQuery(api.users.currentUser);
  const entityTypes = useQuery(api.entityFields.listTypes, {});
  const [typeKey, setTypeKey] = useState("contact");
  const fields = useQuery(api.entityFields.listFields, {
    entityTypeKey: typeKey,
  });
  const deleteField = useMutation(api.entityFields.deleteField);
  const reorderFields = useMutation(api.entityFields.reorderFields);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<Doc<"fieldDefs"> | null>(null);

  if (user !== undefined && user !== null && user.role !== "admin") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        Admin access required. Sign in as the demo admin to manage entity fields.
      </div>
    );
  }

  const move = async (index: number, direction: -1 | 1) => {
    if (fields === undefined) return;
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const orderedIds = fields.map((f) => f._id);
    [orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]];
    try {
      await reorderFields({ entityTypeKey: typeKey, orderedIds });
    } catch {
      toast.error("Could not reorder fields.");
    }
  };

  return (
    <div className="rise-children flex-1 p-4 sm:p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Entity fields</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditingField(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add field</span>
        </Button>
      </div>
      <p className="mb-5 text-sm text-zinc-500">
        Define the schema for each entity like a CMS — fields added here appear
        immediately in forms, lists, and detail panels for every user.
      </p>

      <Tabs value={typeKey} onValueChange={setTypeKey} className="mb-4">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max flex-nowrap">
            {(entityTypes ?? []).map((entityType) => (
              <TabsTrigger
                key={entityType.key}
                value={entityType.key}
                className="whitespace-nowrap"
              >
                {entityType.labelPlural}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <Card className="py-2">
        <CardContent className="overflow-x-auto px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Order</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Options</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(fields ?? []).map((field, index) => (
                <TableRow key={field._id}>
                  <TableCell>
                    <span className="flex gap-0.5">
                      <button
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => void move(index, -1)}
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                        disabled={index === (fields?.length ?? 0) - 1}
                        onClick={() => void move(index, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{field.label}</TableCell>
                  <TableCell className="font-mono text-xs text-zinc-500">
                    {field.key}
                  </TableCell>
                  <TableCell>
                    <BadgePill value={field.type} />
                    {field.type === "relation" && field.relationTo && (
                      <span className="ml-1 text-xs text-zinc-500">
                        → {field.relationTo}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-xs text-zinc-500">
                    {(field.options ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-zinc-600">
                    {field.group ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {field.required && <Badge variant="secondary">required</Badge>}
                      {field.searchable && (
                        <Badge variant="secondary">searchable</Badge>
                      )}
                      {field.showInList && <Badge variant="secondary">in list</Badge>}
                      {field.systemMapping && (
                        <Badge variant="outline">↦ {field.systemMapping}</Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex justify-end gap-0.5">
                      <button
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        onClick={() => {
                          setEditingField(field);
                          setEditorOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        disabled={field.systemMapping === "name"}
                        onClick={() => {
                          if (
                            confirm(
                              `Delete field "${field.label}"? Existing values stay in stored records but are no longer shown.`,
                            )
                          ) {
                            void deleteField({ id: field._id })
                              .then(() => toast.success("Field deleted"))
                              .catch(() => toast.error("Could not delete field."));
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FieldEditorDialog
        entityTypeKey={typeKey}
        entityTypes={entityTypes ?? []}
        field={editingField}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </div>
  );
}
