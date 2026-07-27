"use client";

import { useState } from "react";
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
import { StatCard } from "@/features/dashboard/components/stat-card";
import { TabSkeleton } from "./tab-skeleton";
import { BadgePill } from "@/features/records/components/badge-pill";
import { daysBetween, formatGBP, formatGBPFull } from "@/lib/format";

export function GiftsTab({
  onSelectGift,
}: {
  onSelectGift: (id: string) => void;
}) {
  const [now] = useState(() => Date.now());
  const data = useQuery(api.fundraising.committedGifts, { now });

  if (data === undefined) {
    return <TabSkeleton />;
  }

  const pct =
    data.targetMinor > 0
      ? Math.round((data.committedMinor / data.targetMinor) * 100)
      : 0;

  return (
    <div className="rise-children space-y-5">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={`Total committed ${data.currentYear}`}
          value={formatGBP(data.committedMinor)}
          note={`${pct}% of ${formatGBP(data.targetMinor)} target`}
        />
        <StatCard
          label="Received to date"
          value={formatGBP(data.receivedMinor)}
          noteColor="text-emerald-600"
          note="cash in"
        />
        <StatCard
          label="Instalments due (30d)"
          value={String(data.dueSoonCount)}
          note={
            data.nextDue
              ? `Next: ${data.nextDue.name} ${daysBetween(now, data.nextDue.dueAt)}d`
              : "None upcoming"
          }
          noteColor="text-amber-600"
        />
        <StatCard
          label="Gift Aid (YTD)"
          value={formatGBPFull(data.giftAidMinor)}
          note="claimed on eligible gifts"
          noteColor="text-indigo-600"
        />
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">
            Committed gifts — {data.currentYear} instalments · {data.gifts.length}{" "}
            records
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funder</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Gift Aid</TableHead>
                <TableHead>New/Regrant</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.gifts.map((gift) => (
                <TableRow
                  key={gift._id}
                  className="cursor-pointer"
                  onClick={() => onSelectGift(gift._id)}
                >
                  <TableCell className="font-medium">{gift.name}</TableCell>
                  <TableCell className="text-zinc-600">
                    {typeof gift.fields.funderType === "string"
                      ? gift.fields.funderType
                      : "—"}
                  </TableCell>
                  <TableCell className="text-zinc-600">
                    {typeof gift.fields.budgetCategory === "string"
                      ? gift.fields.budgetCategory
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatGBPFull(gift.amountMinor)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {typeof gift.fields.received === "number"
                      ? `${formatGBPFull(gift.fields.received)} ✓`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {typeof gift.fields.giftAid === "string"
                      ? gift.fields.giftAid
                      : "—"}
                  </TableCell>
                  <TableCell className="text-zinc-600">
                    {typeof gift.fields.newOrRegrant === "string"
                      ? gift.fields.newOrRegrant
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {gift.stage ? <BadgePill value={gift.stage} /> : "—"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-zinc-50/70 font-semibold">
                <TableCell>Total — {data.gifts.length} records</TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right tabular-nums">
                  {formatGBPFull(data.committedMinor)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-emerald-700">
                  {formatGBPFull(data.receivedMinor)} ✓
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
