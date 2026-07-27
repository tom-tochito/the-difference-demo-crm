"use client";

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COMMITTED = "#4f46e5";
const TARGET = "#71717a";

/**
 * Committed income per financial year with the target as a dashed
 * reference line (annotation, not a peer series).
 */
export function IncomeChart({
  years,
  committedTotals,
  targets,
  currentYear,
}: {
  years: Array<string>;
  committedTotals: Array<number>;
  targets: Array<number>;
  currentYear: string;
}) {
  const data = years.map((year, i) => ({
    year,
    committed: Math.round(committedTotals[i] / 100 / 1000),
    target: Math.round(targets[i] / 100 / 1000),
  }));

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Committed vs target by year</CardTitle>
        <p className="text-xs text-zinc-500">
          £k per financial year · current year: {currentYear} · forward years
          show signed instalments only
        </p>
      </CardHeader>
      <CardContent className="px-4">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={{ stroke: "#e4e4e7" }}
                tick={{ fontSize: 11, fill: "#71717a" }}
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
                  name === "committed" ? "Committed" : "Target",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Bar
                dataKey="committed"
                fill={COMMITTED}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Line
                dataKey="target"
                stroke={TARGET}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3, fill: TARGET, strokeWidth: 0 }}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: COMMITTED }} />
            Committed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-b-2 border-dashed" style={{ borderColor: TARGET }} />
            Target
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
