"use client";

import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Columns3, Rows3 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { TabSkeleton } from "./tab-skeleton";
import { BadgePill } from "@/features/records/components/badge-pill";
import { useEntityFields } from "@/features/records/hooks/use-entity-fields";
import { formatGBP, formatGBPFull } from "@/lib/format";

const RAG_DOT: Record<string, string> = {
  Green: "bg-emerald-500",
  Amber: "bg-amber-500",
  Red: "bg-red-500",
};

export function PipelineTab({
  onSelectProspect,
}: {
  onSelectProspect: (id: string) => void;
}) {
  const [view, setView] = useState<"table" | "kanban">("table");
  const stats = useQuery(api.fundraising.pipelineStats, {});
  const { results, status } = usePaginatedQuery(
    api.records.list,
    { entityTypeKey: "pipeline" },
    { initialNumItems: 300 },
  );
  const { byKey } = useEntityFields("pipeline");
  const stages = byKey.get("stage")?.options ?? [];

  if (stats === undefined || status === "LoadingFirstPage") {
    return <TabSkeleton />;
  }

  const rows = [...results].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="rise-children space-y-5">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Active prospects"
          value={String(stats.activeCount)}
          note="25/26 pipeline"
        />
        <StatCard
          label="Total ask value"
          value={formatGBP(stats.totalAskMinor)}
          note="unweighted"
          noteColor="text-zinc-500"
        />
        <StatCard
          label="Weighted value"
          value={formatGBP(stats.weightedMinor)}
          note={`avg likelihood ${stats.avgLikelihood}%`}
          noteColor="text-indigo-600"
        />
        <StatCard
          label="Unsuccessful YTD"
          value={String(stats.unsuccessfulCount)}
          note={`${formatGBP(stats.unsuccessfulAskMinor)} ask value`}
          noteColor="text-red-600"
        />
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4">
          <CardTitle className="text-sm">
            All pipeline prospects — 25/26
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={view === "table" ? "default" : "outline"}
              onClick={() => setView("table")}
            >
              <Rows3 className="size-3.5" /> Table
            </Button>
            <Button
              size="sm"
              variant={view === "kanban" ? "default" : "outline"}
              onClick={() => setView("kanban")}
            >
              <Columns3 className="size-3.5" /> Kanban
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4">
          {view === "table" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funder / prospect</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Ask (25/26)</TableHead>
                    <TableHead className="text-right">Likelihood</TableHead>
                    <TableHead className="text-right">Weighted</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>RAG</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const likelihood =
                      typeof row.fields.likelihood === "number"
                        ? row.fields.likelihood
                        : null;
                    const weighted =
                      likelihood !== null && (row.amountMinor ?? 0) > 0
                        ? Math.round(
                            (row.amountMinor ?? 0) * (likelihood / 100),
                          )
                        : null;
                    return (
                      <TableRow
                        key={row._id}
                        className="cursor-pointer"
                        onClick={() => onSelectProspect(row._id)}
                      >
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          {row.stage ? <BadgePill value={row.stage} /> : "—"}
                        </TableCell>
                        <TableCell>
                          {row.status ? <BadgePill value={row.status} /> : "—"}
                        </TableCell>
                        <TableCell className="text-zinc-600">
                          {typeof row.fields.funderType === "string"
                            ? row.fields.funderType
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(row.amountMinor ?? 0) > 0
                            ? formatGBPFull(row.amountMinor)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-amber-700">
                          {likelihood !== null ? `${likelihood}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {weighted !== null ? formatGBPFull(weighted) : "—"}
                        </TableCell>
                        <TableCell className="text-indigo-600">
                          {typeof row.fields.lead === "string"
                            ? row.fields.lead
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {typeof row.fields.rag === "string" ? (
                            <span
                              className={cn(
                                "inline-block size-2.5 rounded-full",
                                RAG_DOT[row.fields.rag] ?? "bg-zinc-300",
                              )}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {stages.map((stage) => {
                const cards = rows.filter((row) => row.stage === stage);
                return (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    cards={cards}
                    onSelect={onSelectProspect}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanColumn({
  stage,
  cards,
  onSelect,
}: {
  stage: string;
  cards: Array<Doc<"records">>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-60 shrink-0 rounded-lg bg-zinc-50 p-2">
      <p className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-zinc-600">
        {stage}
        <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-600">
          {cards.length}
        </span>
      </p>
      <div className="space-y-2">
        {cards.map((card) => (
          <button
            key={card._id}
            onClick={() => onSelect(card._id)}
            className="w-full rounded-md border border-zinc-200 bg-white p-2.5 text-left shadow-xs transition-shadow hover:shadow-sm"
          >
            <p className="flex items-start justify-between gap-1 text-[13px] font-semibold leading-snug text-zinc-900">
              {card.name}
              {typeof card.fields.rag === "string" && (
                <span
                  className={cn(
                    "mt-0.5 inline-block size-2 shrink-0 rounded-full",
                    RAG_DOT[card.fields.rag] ?? "bg-zinc-300",
                  )}
                />
              )}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {(card.amountMinor ?? 0) > 0
                ? formatGBPFull(card.amountMinor)
                : "No ask yet"}
              {typeof card.fields.likelihood === "number"
                ? ` · ${card.fields.likelihood}%`
                : ""}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-1">
              {card.status && <BadgePill value={card.status} />}
              {typeof card.fields.lead === "string" && (
                <span className="text-[11px] text-indigo-600">
                  {card.fields.lead}
                </span>
              )}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
