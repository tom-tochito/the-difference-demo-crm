"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, Flag, Lock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityLog } from "@/features/records/components/activity-log";
import { BadgePill } from "@/features/records/components/badge-pill";
import { RecordDetailGroups } from "@/features/records/components/record-detail-groups";
import { RecordFormDialog } from "@/features/records/components/record-form-dialog";
import { formatRelative, initials } from "@/lib/format";

export function ContactDetail({
  id,
  isAdmin,
  onDeleted,
  onBack,
}: {
  id: Id<"records">;
  isAdmin: boolean;
  onDeleted: () => void;
  onBack?: () => void;
}) {
  const record = useQuery(api.records.get, { id });
  const activities = useQuery(api.activities.listByRecord, { recordId: id });
  const remove = useMutation(api.records.remove);
  const [editing, setEditing] = useState(false);
  const [now] = useState(() => Date.now());

  if (record === undefined) {
    return (
      <div className="flex-1 space-y-4 p-5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (record === null) {
    return <div className="p-6 text-sm text-zinc-500">Contact not found.</div>;
  }

  const journey = (activities ?? [])
    .filter((a) => a.kind === "journey")
    .sort((a, b) => a.happenedAt - b.happenedAt);
  const tags = Array.isArray(record.fields.tags)
    ? (record.fields.tags as Array<string>)
    : [];
  const warmth =
    typeof record.fields.warmth === "string" ? record.fields.warmth : null;
  const score =
    typeof record.fields.relationshipScore === "number"
      ? record.fields.relationshipScore
      : null;

  return (
    <div className="rise-children flex-1 overflow-y-auto p-4 sm:p-5">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 lg:hidden"
        >
          <ChevronLeft className="size-4" /> All contacts
        </button>
      )}
      <Card className="mb-4 py-4">
        <CardContent className="flex flex-wrap items-start gap-4 px-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initials(record.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 basis-52">
            <h2 className="text-lg font-bold text-zinc-900">{record.name}</h2>
            <p className="text-sm text-zinc-500">
              {typeof record.fields.role === "string" ? record.fields.role : ""}
              {record.parentName ? ` · ${record.parentName}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <BadgePill key={tag} value={tag} />
              ))}
              {warmth && <BadgePill value={warmth} />}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {record.restricted && (
              <span className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                <Lock className="size-3" /> Restricted
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => {
                  if (confirm(`Delete ${record.name}? This cannot be undone.`)) {
                    void remove({ id })
                      .then(() => {
                        toast.success("Contact deleted");
                        onDeleted();
                      })
                      .catch(() => toast.error("Could not delete contact."));
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {record.flagged && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Flag className="size-4 shrink-0 fill-amber-500 text-amber-500" />
          <p>
            <span className="font-semibold">Contact check:</span> multiple teams
            have approached this contact recently. Check before sending.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          {journey.length > 0 && (
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Programme journey</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <ol className="relative space-y-4 border-l border-zinc-200 pl-5">
                  {journey.map((step) => (
                    <li key={step._id} className="relative">
                      <span className="absolute -left-[26.5px] top-0.5 flex size-3 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white" />
                      <p className="text-sm font-medium text-zinc-900">
                        {step.body}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatRelative(step.happenedAt, now)}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
          <ActivityLog recordId={id} />
        </div>
        <div className="space-y-4 xl:col-span-2">
          {score !== null && (
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Relationship</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-600">{warmth ?? "—"}</span>
                  <span className="font-semibold tabular-nums">{score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, score)}%` }}
                  />
                </div>
                {typeof record.fields.primaryOwner === "string" && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Primary: {record.fields.primaryOwner}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          <RecordDetailGroups
            entityTypeKey="contact"
            fields={record.fields}
            relationNames={record.relationNames}
            excludeGroups={["Relationship"]}
          />
        </div>
      </div>

      <RecordFormDialog
        entityTypeKey="contact"
        entityLabel="Contact"
        record={record}
        open={editing}
        onOpenChange={setEditing}
      />
    </div>
  );
}
