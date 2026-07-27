"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BadgePill } from "./badge-pill";
import { formatRelative } from "@/lib/format";

const DOT: Record<string, string> = {
  email: "bg-violet-400",
  meeting: "bg-emerald-400",
  note: "bg-amber-400",
  journey: "bg-sky-400",
  system: "bg-zinc-300",
};

const KINDS = ["note", "call", "email", "meeting"] as const;

export function ActivityLog({ recordId }: { recordId: Id<"records"> }) {
  const activities = useQuery(api.activities.listByRecord, { recordId });
  const log = useMutation(api.activities.log);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<string>("note");
  const [now] = useState(() => Date.now());

  const visible = (activities ?? []).filter((a) => a.kind !== "journey");

  const handleAdd = async () => {
    if (draft.trim() === "") return;
    try {
      await log({ recordId, kind, body: draft.trim() });
      setDraft("");
    } catch {
      toast.error("Could not log activity.");
    }
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex-row items-center justify-between px-4">
        <CardTitle className="text-sm">Activity log</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="mb-3 flex gap-2">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger size="sm" className="w-[104px] shrink-0 text-xs capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k} value={k} className="capitalize">
                  <span
                    className={`size-2 rounded-full ${DOT[k] ?? "bg-zinc-300"}`}
                  />
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAdd();
            }}
            placeholder="Log an activity…"
            className="h-8 text-sm"
          />
          <Button size="sm" variant="outline" onClick={handleAdd}>
            Log
          </Button>
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((activity) => (
              <li key={activity._id} className="flex gap-2.5 text-sm">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[activity.kind] ?? "bg-zinc-300"}`}
                />
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">
                    {activity.body}{" "}
                    {activity.team && (
                      <BadgePill value={activity.team} className="ml-1" />
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {activity.detail ? `${activity.detail} · ` : ""}
                    {formatRelative(activity.happenedAt, now)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
