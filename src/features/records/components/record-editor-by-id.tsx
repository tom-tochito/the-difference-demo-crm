"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { RecordFormDialog } from "./record-form-dialog";

/** Loads a record by id and opens the dynamic edit dialog for it. */
export function RecordEditorById({
  id,
  entityLabel,
  onClose,
}: {
  id: Id<"records"> | null;
  entityLabel: string;
  onClose: () => void;
}) {
  const record = useQuery(api.records.get, id === null ? "skip" : { id });
  if (id === null || record === undefined || record === null) {
    return null;
  }
  return (
    <RecordFormDialog
      entityTypeKey={record.entityTypeKey}
      entityLabel={entityLabel}
      record={record}
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    />
  );
}
