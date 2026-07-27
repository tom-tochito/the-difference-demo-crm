"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ContactDetail } from "@/features/contacts/components/contact-detail";
import { RecordFormDialog } from "@/features/records/components/record-form-dialog";
import { RecordListPanel } from "@/features/records/components/record-list-panel";

function ContactsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id") as Id<"records"> | null;
  const [creating, setCreating] = useState(searchParams.get("new") === "1");
  const user = useQuery(api.users.currentUser);

  const select = (id: Id<"records"> | null) => {
    router.replace(id ? `/contacts?id=${id}` : "/contacts");
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-1 flex-col lg:h-dvh">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
        <h1 className="text-lg font-bold text-zinc-900">All contacts</h1>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add contact</span>
        </Button>
      </div>
      <div className="flex min-h-0 flex-1">
        <RecordListPanel
          entityTypeKey="contact"
          selectedId={selectedId}
          onSelect={select}
          emptyLabel="No contacts found"
          className={selectedId ? "hidden" : "flex"}
        />
        <div
          className={cn(
            "min-w-0 flex-1 flex-col",
            selectedId ? "flex" : "hidden lg:flex",
          )}
        >
          {selectedId ? (
            <ContactDetail
              id={selectedId}
              isAdmin={user?.role === "admin"}
              onDeleted={() => select(null)}
              onBack={() => select(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
              Select a contact to view their record
            </div>
          )}
        </div>
      </div>
      <RecordFormDialog
        entityTypeKey="contact"
        entityLabel="Contact"
        open={creating}
        onOpenChange={setCreating}
        onSaved={(id) => select(id)}
      />
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense>
      <ContactsContent />
    </Suspense>
  );
}
