"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { OrgDetail } from "@/features/organisations/components/org-detail";
import { RecordFormDialog } from "@/features/records/components/record-form-dialog";
import { RecordListPanel } from "@/features/records/components/record-list-panel";
import { useEntityFields } from "@/features/records/hooks/use-entity-fields";

const ALL = "__all__";

function OrganisationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id") as Id<"records"> | null;
  const [creating, setCreating] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const user = useQuery(api.users.currentUser);
  const { byKey } = useEntityFields("organisation");
  const typeOptions = byKey.get("orgType")?.options ?? [];

  const select = (id: Id<"records"> | null) => {
    router.replace(id ? `/organisations?id=${id}` : "/organisations");
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-1 flex-col lg:h-dvh">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
        <h1 className="text-lg font-bold text-zinc-900">Organisations</h1>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-36 text-sm sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All organisations</SelectItem>
              {typeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add organisation</span>
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <RecordListPanel
          entityTypeKey="organisation"
          selectedId={selectedId}
          onSelect={select}
          stageFilter={typeFilter === ALL ? undefined : typeFilter}
          emptyLabel="No organisations found"
          className={selectedId ? "hidden" : "flex"}
        />
        <div
          className={cn(
            "min-w-0 flex-1 flex-col",
            selectedId ? "flex" : "hidden lg:flex",
          )}
        >
          {selectedId ? (
            <OrgDetail
              id={selectedId}
              isAdmin={user?.role === "admin"}
              onDeleted={() => select(null)}
              onBack={() => select(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
              Select an organisation to view its record
            </div>
          )}
        </div>
      </div>
      <RecordFormDialog
        entityTypeKey="organisation"
        entityLabel="Organisation"
        open={creating}
        onOpenChange={setCreating}
        onSaved={(id) => select(id)}
      />
    </div>
  );
}

export default function OrganisationsPage() {
  return (
    <Suspense>
      <OrganisationsContent />
    </Suspense>
  );
}
