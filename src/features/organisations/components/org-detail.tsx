"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
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

export function OrgDetail({
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
  const contacts = useQuery(api.records.listChildren, {
    parentId: id,
    entityTypeKey: "contact",
  });
  const gifts = useQuery(api.records.listChildren, {
    parentId: id,
    entityTypeKey: "gift",
  });
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
    return <div className="p-6 text-sm text-zinc-500">Organisation not found.</div>;
  }

  const tags = Array.isArray(record.fields.tags)
    ? (record.fields.tags as Array<string>)
    : [];
  const orgType =
    typeof record.fields.orgType === "string" ? record.fields.orgType : null;

  return (
    <div className="rise-children flex-1 overflow-y-auto p-4 sm:p-5">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 lg:hidden"
        >
          <ChevronLeft className="size-4" /> All organisations
        </button>
      )}
      <Card className="mb-4 py-4">
        <CardContent className="flex flex-wrap items-start gap-4 px-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-emerald-100 text-sm font-semibold text-emerald-700">
              {initials(record.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 basis-52">
            <h2 className="text-lg font-bold text-zinc-900">{record.name}</h2>
            <p className="text-sm text-zinc-500">
              {[orgType, record.fields.region]
                .filter((x): x is string => typeof x === "string")
                .join(" · ")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {orgType && <BadgePill value={orgType} />}
              {tags.map((tag) => (
                <BadgePill key={tag} value={tag} />
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
                        toast.success("Organisation deleted");
                        onDeleted();
                      })
                      .catch(() =>
                        toast.error(
                          "Could not delete. Records may still reference this organisation.",
                        ),
                      );
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">
                Contacts at this organisation
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {contacts === undefined || contacts.length === 0 ? (
                <p className="text-sm text-zinc-500">No contacts linked yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {contacts.map((contact) => (
                    <li key={contact._id}>
                      <Link
                        href={`/contacts?id=${contact._id}`}
                        className="flex items-center gap-3 py-2.5 hover:bg-zinc-50"
                      >
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-indigo-100 text-xs text-indigo-700">
                            {initials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-900">
                            {contact.name}
                          </p>
                          <p className="truncate text-xs text-zinc-500">
                            {typeof contact.fields.role === "string"
                              ? contact.fields.role
                              : ""}
                          </p>
                        </div>
                        {typeof contact.fields.warmth === "string" && (
                          <BadgePill value={contact.fields.warmth} />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {gifts !== undefined && gifts.length > 0 && (
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Gifts from this funder</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <ul className="divide-y divide-zinc-100">
                  {gifts.map((gift) => (
                    <li
                      key={gift._id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="text-zinc-700">
                        {typeof gift.fields.financialYear === "string"
                          ? `${gift.fields.financialYear} · `
                          : ""}
                        {typeof gift.fields.budgetCategory === "string"
                          ? gift.fields.budgetCategory
                          : "Gift"}
                      </span>
                      <span className="flex items-center gap-2">
                        {gift.stage && <BadgePill value={gift.stage} />}
                        <span className="font-semibold tabular-nums">
                          £
                          {((gift.amountMinor ?? 0) / 100).toLocaleString(
                            "en-GB",
                          )}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <ActivityLog recordId={id} />
        </div>
        <div className="space-y-4 xl:col-span-2">
          <RecordDetailGroups
            entityTypeKey="organisation"
            fields={record.fields}
            relationNames={record.relationNames}
          />
          <p className="text-xs text-zinc-400">
            Record created {formatRelative(record._creationTime, now)}
          </p>
        </div>
      </div>

      <RecordFormDialog
        entityTypeKey="organisation"
        entityLabel="Organisation"
        record={record}
        open={editing}
        onOpenChange={setEditing}
      />
    </div>
  );
}
