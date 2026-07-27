"use client";

import { useQuery } from "convex/react";
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
import { cn } from "@/lib/utils";
import { formatGBP } from "@/lib/format";
import { TabSkeleton } from "./tab-skeleton";

export function FinancialOverviewTab() {
  const data = useQuery(api.fundraising.financialOverview, {});

  if (data === undefined) {
    return <TabSkeleton />;
  }

  const currentIndex = data.years.indexOf(data.currentYear);
  const pctOfTarget = data.years.map((_, i) =>
    data.targets[i] > 0
      ? Math.round((data.committedTotals[i] / data.targets[i]) * 100)
      : 0,
  );
  const gaps = data.years.map((_, i) => data.committedTotals[i] - data.targets[i]);

  const currentCell = (i: number) =>
    cn("text-right tabular-nums", i === currentIndex && "bg-indigo-50/60");

  return (
    <div className="rise-children space-y-5">
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">
            Income by category — committed vs target
          </CardTitle>
          <p className="text-xs text-zinc-500">
            Current year: {data.currentYear} · Positive gap = surplus, negative =
            shortfall
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-52">Category</TableHead>
                {data.years.map((year, i) => (
                  <TableHead
                    key={year}
                    className={cn(
                      "text-right",
                      i === currentIndex && "font-bold text-indigo-700",
                    )}
                  >
                    {year}
                    {i === currentIndex ? " ◀" : ""}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-zinc-50/70 font-semibold">
                <TableCell>Target</TableCell>
                {data.targets.map((target, i) => (
                  <TableCell key={i} className={currentCell(i)}>
                    {formatGBP(target)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell>Committed total</TableCell>
                {data.committedTotals.map((total, i) => (
                  <TableCell
                    key={i}
                    className={cn(currentCell(i), "text-emerald-700")}
                  >
                    {formatGBP(total)}
                  </TableCell>
                ))}
              </TableRow>
              {data.rows.map((row) => (
                <TableRow key={row.category}>
                  <TableCell className="pl-6 text-zinc-600">
                    {row.category}
                  </TableCell>
                  {row.byYear.map((value, i) => (
                    <TableCell key={i} className={currentCell(i)}>
                      {value === 0 ? "—" : formatGBP(value)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="text-zinc-500">% of target</TableCell>
                {pctOfTarget.map((pct, i) => (
                  <TableCell
                    key={i}
                    className={cn(
                      currentCell(i),
                      pct >= 90
                        ? "text-emerald-600"
                        : pct >= 60
                          ? "text-amber-600"
                          : "text-red-600",
                    )}
                  >
                    {pct}%
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="italic">
                <TableCell className="text-zinc-500">Gap to target</TableCell>
                {gaps.map((gap, i) => (
                  <TableCell
                    key={i}
                    className={cn(
                      currentCell(i),
                      gap >= 0 ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {gap >= 0 ? "+" : "−"}
                    {formatGBP(Math.abs(gap))}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-zinc-500">
            Forward years show only instalments from multi-year grants already
            signed — they will grow as new grants are secured.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">
              Committed — {data.currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <SummaryRow
              label="Committed total"
              value={formatGBP(data.committedTotals[currentIndex] ?? 0)}
              strong
            />
            <SummaryRow
              label="Target"
              value={formatGBP(data.targets[currentIndex] ?? 0)}
            />
            <SummaryRow
              label="Gap vs target"
              value={`${(gaps[currentIndex] ?? 0) >= 0 ? "+" : "−"}${formatGBP(Math.abs(gaps[currentIndex] ?? 0))}`}
              tone={(gaps[currentIndex] ?? 0) >= 0 ? "positive" : "negative"}
            />
            <div className="mt-3 h-2 rounded-full bg-zinc-100">
              <div
                className="h-2 rounded-full bg-indigo-500"
                style={{
                  width: `${Math.min(100, pctOfTarget[currentIndex] ?? 0)}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Committed: {pctOfTarget[currentIndex] ?? 0}% of target
            </p>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Forward years — committed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4">
            {data.years.map((year, i) => {
              if (i <= currentIndex) return null;
              const pct = pctOfTarget[i] ?? 0;
              return (
                <div key={year}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-zinc-700">
                      {year} target {formatGBP(data.targets[i])}
                    </span>
                    <span className="font-semibold tabular-nums text-zinc-900">
                      {pct}% committed
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Committed: {formatGBP(data.committedTotals[i])}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-1.5 text-sm last:border-0">
      <span className="text-zinc-600">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "font-bold text-zinc-900" : "font-medium text-zinc-800",
          tone === "positive" && "text-emerald-600",
          tone === "negative" && "text-red-600",
        )}
      >
        {value}
      </span>
    </div>
  );
}
