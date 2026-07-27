"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { TabSkeleton } from "./tab-skeleton";
import { BadgePill } from "@/features/records/components/badge-pill";
import { useEntityFields } from "@/features/records/hooks/use-entity-fields";
import { daysBetween, formatDate } from "@/lib/format";

const ALL = "__all__";

export function DeadlinesTab({
  onSelectDeadline,
}: {
  onSelectDeadline: (id: string) => void;
}) {
  const [now] = useState(() => Date.now());
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [leadFilter, setLeadFilter] = useState(ALL);
  const { byKey } = useEntityFields("deadline");
  const data = useQuery(api.fundraising.deadlines, {
    now,
    type: typeFilter === ALL ? undefined : typeFilter,
    lead: leadFilter === ALL ? undefined : leadFilter,
  });

  if (data === undefined) {
    return <TabSkeleton />;
  }

  const typeOptions = byKey.get("deadlineType")?.options ?? [];
  const leadOptions = byKey.get("lead")?.options ?? [];

  return (
    <div className="rise-children space-y-5">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Overdue"
          value={String(data.overdue.length)}
          note="action required now"
          noteColor="text-red-600"
        />
        <StatCard
          label="Due in 30 days"
          value={String(data.due30.length)}
          note="applications & reports"
          noteColor="text-amber-600"
        />
        <StatCard
          label="Due in 31–90 days"
          value={String(data.due90.length)}
          note="plan ahead"
          noteColor="text-indigo-600"
        />
        <StatCard
          label="Completed"
          value={String(data.completed.length)}
          note="this year"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {typeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={leadFilter} onValueChange={setLeadFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All leads</SelectItem>
            {leadOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DeadlineSection
        title="⚑ Overdue — action required"
        tone="border-red-200"
        rows={data.overdue}
        daysLabel={(d) => `${daysBetween(d.dueAt ?? now, now)} days overdue`}
        onSelect={onSelectDeadline}
      />
      <DeadlineSection
        title="Due within 30 days"
        rows={data.due30}
        daysLabel={(d) => `${daysBetween(now, d.dueAt ?? now)} days remaining`}
        onSelect={onSelectDeadline}
      />
      <DeadlineSection
        title="Further ahead — 31–90 days"
        rows={data.due90}
        daysLabel={(d) => `${daysBetween(now, d.dueAt ?? now)} days`}
        onSelect={onSelectDeadline}
      />
      <DeadlineSection
        title="✓ Completed"
        rows={data.completed}
        daysLabel={(d) =>
          typeof d.fields.outcome === "string" ? d.fields.outcome : "Done"
        }
        onSelect={onSelectDeadline}
      />
    </div>
  );
}

function DeadlineSection({
  title,
  tone,
  rows,
  daysLabel,
  onSelect,
}: {
  title: string;
  tone?: string;
  rows: Array<Doc<"records">>;
  daysLabel: (row: Doc<"records">) => string;
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <Card className={`gap-3 py-4 ${tone ?? ""}`}>
      <CardHeader className="flex-row items-center justify-between px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        <span className="text-xs text-zinc-500">{rows.length} items</span>
      </CardHeader>
      <CardContent className="overflow-x-auto px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funder</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Timing</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead className="min-w-64">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row._id}
                className="cursor-pointer"
                onClick={() => onSelect(row._id)}
              >
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>
                  {row.stage ? <BadgePill value={row.stage} /> : "—"}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(row.dueAt)}
                </TableCell>
                <TableCell className="text-zinc-600">{daysLabel(row)}</TableCell>
                <TableCell className="text-indigo-600">
                  {typeof row.fields.lead === "string" ? row.fields.lead : "—"}
                </TableCell>
                <TableCell className="max-w-md truncate text-zinc-600">
                  {typeof row.fields.notes === "string" ? row.fields.notes : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
