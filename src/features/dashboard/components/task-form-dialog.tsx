"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const TEAMS = [
  "Fundraising",
  "DSP",
  "ILC",
  "Comms",
  "Policy",
  "Partnerships",
];

const NONE = "__none__";
const LINK_TYPES = [
  { key: "contact", label: "Contact" },
  { key: "organisation", label: "Organisation" },
  { key: "gift", label: "Gift" },
  { key: "pipeline", label: "Pipeline prospect" },
] as const;

export function TaskFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <TaskForm onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const user = useQuery(api.users.currentUser);
  const addTask = useMutation(api.tasks.add);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [team, setTeam] = useState<string>(NONE);
  const [assignee, setAssignee] = useState("");
  const [linkType, setLinkType] = useState<string>(NONE);
  const [linkId, setLinkId] = useState<string>(NONE);
  const [saving, setSaving] = useState(false);

  const linkOptions = useQuery(
    api.records.list,
    linkType === NONE
      ? "skip"
      : {
          entityTypeKey: linkType,
          paginationOpts: { numItems: 200, cursor: null },
        },
  );
  const sortedOptions = [...(linkOptions?.page ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const handleSave = async () => {
    if (title.trim() === "") return;
    setSaving(true);
    try {
      await addTask({
        title: title.trim(),
        dueAt: dueDate === "" ? undefined : new Date(`${dueDate}T12:00:00Z`).getTime(),
        team: team === NONE ? undefined : team,
        assigneeName: assignee.trim() === "" ? undefined : assignee.trim(),
        recordId: linkId === NONE ? undefined : (linkId as Id<"records">),
      });
      toast.success("Task added");
      onOpenChange(false);
    } catch {
      toast.error("Could not add task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add task</DialogTitle>
        <DialogDescription>
          Tasks can carry a team tag and be attached to any record.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-zinc-600">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chase Esmée Fairbairn report sign-off"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-zinc-600">Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-zinc-600">Team tag</Label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  {user?.team ? `${user.team} (mine)` : "None"}
                </SelectItem>
                {TEAMS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-zinc-600">Assignee</Label>
          <Input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder={user?.name ?? "Assignee"}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-zinc-600">Link to</Label>
            <Select
              value={linkType}
              onValueChange={(next) => {
                setLinkType(next);
                setLinkId(NONE);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Record type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No linked record</SelectItem>
                {LINK_TYPES.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-zinc-600">Record</Label>
            <Select
              value={linkId}
              onValueChange={setLinkId}
              disabled={linkType === NONE}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {sortedOptions.map((option) => (
                  <SelectItem key={option._id} value={option._id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || title.trim() === ""}>
          {saving ? "Adding…" : "Add task"}
        </Button>
      </DialogFooter>
    </>
  );
}
