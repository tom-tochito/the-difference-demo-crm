"use client";

import { useMemo } from "react";
import { usePaginatedQuery } from "convex/react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BadgePill } from "@/features/records/components/badge-pill";
import { useEntityFields } from "@/features/records/hooks/use-entity-fields";
import { formatGBPFull } from "@/lib/format";
import { TabSkeleton } from "./tab-skeleton";

const UNWEIGHTED = "#4f46e5";
const WEIGHTED = "#d97706";
const STAGE_BAR = "#4f46e5";

const RAG = [
  { key: "Green", color: "bg-emerald-500", text: "text-emerald-700" },
  { key: "Amber", color: "bg-amber-500", text: "text-amber-700" },
  { key: "Red", color: "bg-red-500", text: "text-red-700" },
];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e4e4e7",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export function PipelineAnalysisTab() {
  const { results, status } = usePaginatedQuery(
    api.records.list,
    { entityTypeKey: "pipeline" },
    { initialNumItems: 300 },
  );
  const { byKey } = useEntityFields("pipeline");
  const stages = useMemo(
    () => byKey.get("stage")?.options ?? [],
    [byKey],
  );

  const analysis = useMemo(() => {
    const byStage = stages.map((stage) => {
      const rows = results.filter((r) => r.stage === stage);
      const askMinor = rows.reduce((sum, r) => sum + (r.amountMinor ?? 0), 0);
      const weightedMinor = rows.reduce((sum, r) => {
        const likelihood =
          typeof r.fields.likelihood === "number" ? r.fields.likelihood : 0;
        return sum + Math.round((r.amountMinor ?? 0) * (likelihood / 100));
      }, 0);
      return {
        stage: stage.replace(/^\d+\.\s*/, ""),
        count: rows.length,
        ask: Math.round(askMinor / 100 / 1000),
        weighted: Math.round(weightedMinor / 100 / 1000),
      };
    });
    const ragCounts = RAG.map(({ key }) => ({
      key,
      count: results.filter((r) => r.fields.rag === key).length,
    }));
    const topAsks = [...results]
      .filter(
        (r) =>
          (r.amountMinor ?? 0) > 0 &&
          r.stage !== "Successful" &&
          r.stage !== "Unsuccessful",
      )
      .sort((a, b) => (b.amountMinor ?? 0) - (a.amountMinor ?? 0))
      .slice(0, 10);
    return { byStage, ragCounts, topAsks };
  }, [results, stages]);

  if (status === "LoadingFirstPage") {
    return <TabSkeleton />;
  }

  const ragTotal = analysis.ragCounts.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="rise-children space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Prospects by stage</CardTitle>
            <p className="text-xs text-zinc-500">
              Count of pipeline records in each stewardship stage
            </p>
          </CardHeader>
          <CardContent className="px-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analysis.byStage}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#71717a" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    formatter={(value) => [String(value), "Prospects"]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="count"
                    fill={STAGE_BAR}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                    label={{
                      position: "right",
                      fontSize: 11,
                      fill: "#52525b",
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Ask value by stage</CardTitle>
            <p className="text-xs text-zinc-500">
              £k unweighted ask vs likelihood-weighted value
            </p>
          </CardHeader>
          <CardContent className="px-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analysis.byStage.filter((s) => s.ask > 0)}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <XAxis
                    dataKey="stage"
                    tickLine={false}
                    axisLine={{ stroke: "#e4e4e7" }}
                    tick={{ fontSize: 10, fill: "#71717a" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    tickFormatter={(v: number) => `£${v}k`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    formatter={(value, name) => [
                      `£${Number(value).toLocaleString("en-GB")}k`,
                      name === "ask" ? "Unweighted ask" : "Weighted",
                    ]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "ask" ? "Unweighted ask" : "Weighted"
                    }
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="ask" fill={UNWEIGHTED} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="weighted" fill={WEIGHTED} radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="gap-3 py-4 lg:col-span-2">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">RAG breakdown</CardTitle>
            <p className="text-xs text-zinc-500">
              Relationship health across {ragTotal} rated prospects
            </p>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
              {analysis.ragCounts.map(({ key, count }) => {
                const rag = RAG.find((r) => r.key === key);
                return count > 0 ? (
                  <div
                    key={key}
                    className={rag?.color}
                    style={{ width: `${(count / Math.max(1, ragTotal)) * 100}%` }}
                  />
                ) : null;
              })}
            </div>
            <div className="mt-4 space-y-2">
              {analysis.ragCounts.map(({ key, count }) => {
                const rag = RAG.find((r) => r.key === key);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 text-zinc-700">
                      <span className={`size-2.5 rounded-full ${rag?.color}`} />
                      {key}
                    </span>
                    <span className={`font-semibold tabular-nums ${rag?.text}`}>
                      {count}
                      <span className="ml-1 font-normal text-zinc-400">
                        ({Math.round((count / Math.max(1, ragTotal)) * 100)}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 lg:col-span-3">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Top open asks</CardTitle>
            <p className="text-xs text-zinc-500">
              Largest live asks not yet decided
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Ask</TableHead>
                  <TableHead className="text-right">Likelihood</TableHead>
                  <TableHead>Lead</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.topAsks.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      {row.stage ? <BadgePill value={row.stage} /> : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatGBPFull(row.amountMinor)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-amber-700">
                      {typeof row.fields.likelihood === "number"
                        ? `${row.fields.likelihood}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-indigo-600">
                      {typeof row.fields.lead === "string"
                        ? row.fields.lead
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
