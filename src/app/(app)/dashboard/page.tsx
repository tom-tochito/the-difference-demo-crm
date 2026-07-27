"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Flag, Plus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { TaskFormDialog } from "@/features/dashboard/components/task-form-dialog";
import { BadgePill } from "@/features/records/components/badge-pill";
import { formatDate, formatGBP, formatRelative } from "@/lib/format";
import { toast } from "sonner";

const PROGRAMME_BAR: Record<string, string> = {
  "ILC partnerships": "bg-indigo-500",
  "DSP schools": "bg-emerald-500",
  "General fundraising": "bg-amber-500",
};

export default function DashboardPage() {
  // Stable per-mount "now" — the query re-runs on data changes reactively.
  const [now] = useState(() => Date.now());
  const data = useQuery(api.dashboard.overview, { now });
  const setDone = useMutation(api.tasks.setDone);
  const [addingTask, setAddingTask] = useState(false);

  const maxProgramme = useMemo(
    () =>
      Math.max(1, ...(data?.pipelineByProgramme ?? []).map((p) => p.amountMinor)),
    [data],
  );

  if (data === undefined) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const pctToTarget =
    data.targetMinor > 0
      ? Math.round((data.committedMinor / data.targetMinor) * 100)
      : 0;

  return (
    <div className="rise-children flex-1 p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Dashboard</h1>
        <Button asChild size="sm">
          <Link href="/contacts?new=1">
            <Plus className="size-4" /> Add contact
          </Link>
        </Button>
      </div>

      {data.flagged.length > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Flag className="size-4 shrink-0 fill-amber-500 text-amber-500" />
          <p>
            <span className="font-semibold">
              {data.flagged.length} contacts flagged this week
            </span>{" "}
            — multiple teams have approached the same person within 7 days.
            Review before sending bulk emails.
          </p>
          <Link
            href={`/contacts?id=${data.flagged[0]._id}`}
            className="ml-auto shrink-0 font-semibold text-amber-800 hover:underline"
          >
            View flagged →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total contacts"
          value={String(data.totalContacts)}
          note={`+${data.newContactsThisMonth} this month`}
        />
        <StatCard
          label="Active pipeline"
          value={formatGBP(data.activePipelineMinor)}
          note={`${data.openDealCount} open deals`}
          noteColor="text-indigo-600"
        />
        <StatCard
          label={`Committed ${"25/26"}`}
          value={formatGBP(data.committedMinor)}
          note={`${pctToTarget}% of ${formatGBP(data.targetMinor)} target`}
          noteColor={pctToTarget >= 90 ? "text-emerald-600" : "text-amber-600"}
        />
        <StatCard
          label="Reporting deadlines"
          value={String(data.deadlinesDueSoon)}
          note="due in next 30 days"
          noteColor="text-amber-600"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card className="gap-3 py-4 lg:col-span-3">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Recent activity — all teams</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <ul className="divide-y divide-zinc-100">
              {data.recentActivities.map((activity) => (
                <li key={activity._id} className="flex gap-2.5 py-2.5 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-400" />
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
          </CardContent>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Pipeline by programme</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="space-y-3">
                {data.pipelineByProgramme.map((row) => (
                  <div key={row.programme}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-zinc-700">{row.programme}</span>
                      <span className="font-semibold tabular-nums text-zinc-900">
                        {formatGBP(row.amountMinor)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100">
                      <div
                        className={`h-1.5 rounded-full ${PROGRAMME_BAR[row.programme] ?? "bg-zinc-400"}`}
                        style={{
                          width: `${Math.round((row.amountMinor / maxProgramme) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {data.deadlinesDueSoon} reporting deadlines in next 30 days
              </p>
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="flex-row items-center justify-between px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                Open tasks
                <Badge variant="secondary">{data.openTasks.length} open</Badge>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingTask(true)}
              >
                <Plus className="size-3.5" /> Add task
              </Button>
            </CardHeader>
            <CardContent className="px-4">
              {data.openTasks.length === 0 && (
                <p className="text-sm text-zinc-500">
                  All clear — no open tasks.
                </p>
              )}
              <ul className="space-y-2.5">
                {data.openTasks.map((task) => {
                  const overdue = task.dueAt !== undefined && task.dueAt < now;
                  return (
                    <li
                      key={task._id}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Checkbox
                        className="mt-0.5"
                        onCheckedChange={() => {
                          void setDone({ id: task._id, done: true }).catch(() =>
                            toast.error("Could not complete task."),
                          );
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium leading-snug text-zinc-900">
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {task.dueAt !== undefined && (
                            <span
                              className={
                                overdue ? "font-semibold text-red-600" : ""
                              }
                            >
                              {overdue ? "Overdue — " : "Due "}
                              {formatDate(task.dueAt)}
                              {" · "}
                            </span>
                          )}
                          {task.recordName ? `${task.recordName} · ` : ""}
                          {task.assigneeName}
                          {task.team && (
                            <BadgePill value={task.team} className="ml-1.5" />
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <TaskFormDialog open={addingTask} onOpenChange={setAddingTask} />
        </div>
      </div>
    </div>
  );
}
