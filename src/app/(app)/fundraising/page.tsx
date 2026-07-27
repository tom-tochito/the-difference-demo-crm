"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeadlinesTab } from "@/features/fundraising/components/deadlines-tab";
import { FinancialOverviewTab } from "@/features/fundraising/components/financial-overview-tab";
import { GiftsTab } from "@/features/fundraising/components/gifts-tab";
import { PipelineTab } from "@/features/fundraising/components/pipeline-tab";
import { RecordEditorById } from "@/features/records/components/record-editor-by-id";
import { RecordFormDialog } from "@/features/records/components/record-form-dialog";

const TABS = [
  { value: "overview", label: "Financial overview" },
  { value: "gifts", label: "Committed gifts" },
  { value: "pipeline", label: "Pipeline" },
  { value: "deadlines", label: "Deadlines" },
] as const;

const STUB_TABS = [
  "Termly targets",
  "Meeting tracker",
  "Pipeline analysis",
  "Relationship tracker",
];

function FundraisingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "overview";
  const [editingId, setEditingId] = useState<Id<"records"> | null>(null);
  const [editingLabel, setEditingLabel] = useState("Record");
  const [addingProspect, setAddingProspect] = useState(false);

  const openEditor = (label: string) => (id: string) => {
    setEditingLabel(label);
    setEditingId(id as Id<"records">);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Fundraising</h1>
        <Button size="sm" onClick={() => setAddingProspect(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add to pipeline</span>
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(next) => router.replace(`/fundraising?tab=${next}`)}
        className="mb-5"
      >
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max flex-nowrap justify-start bg-transparent p-0">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="whitespace-nowrap rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {t.label}
              </TabsTrigger>
            ))}
            {STUB_TABS.map((label) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <span className="cursor-not-allowed whitespace-nowrap px-3 py-2 text-sm text-zinc-400">
                    {label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Not in demo scope</TooltipContent>
              </Tooltip>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {tab === "overview" && <FinancialOverviewTab />}
      {tab === "gifts" && <GiftsTab onSelectGift={openEditor("Gift")} />}
      {tab === "pipeline" && (
        <PipelineTab onSelectProspect={openEditor("Pipeline prospect")} />
      )}
      {tab === "deadlines" && (
        <DeadlinesTab onSelectDeadline={openEditor("Deadline")} />
      )}

      <RecordEditorById
        id={editingId}
        entityLabel={editingLabel}
        onClose={() => setEditingId(null)}
      />
      <RecordFormDialog
        entityTypeKey="pipeline"
        entityLabel="Pipeline prospect"
        open={addingProspect}
        onOpenChange={setAddingProspect}
      />
    </div>
  );
}

export default function FundraisingPage() {
  return (
    <Suspense>
      <FundraisingContent />
    </Suspense>
  );
}
