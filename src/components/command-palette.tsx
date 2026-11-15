"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);
  return { open, setOpen };
}
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [text, setText] = useState("");
  const user = useQuery(api.users.currentUser);
  const platform = useQuery(
    api.shipping.search,
    open && text && user?.role === "superadmin" ? { text } : "skip",
  );
  const client = useQuery(
    api.client.search,
    open && text && user && user.role !== "superadmin" ? { text } : "skip",
  );
  const rows = user?.role === "superadmin" ? platform : client;
  const router = useRouter();
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search your workspace"
      description="Only records available to your account appear."
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={text}
          onValueChange={setText}
          placeholder="Find a shipment, quote or enquiry…"
        />
        <CommandList>
          <CommandEmpty>
            {!text
              ? "Type to search"
              : rows === undefined
                ? "Searching…"
                : "No matching records"}
          </CommandEmpty>
          {rows?.map((r) => (
            <CommandItem
              key={r.id}
              value={r.id}
              onSelect={() => {
                onOpenChange(false);
                router.push(r.href);
              }}
            >
              <span className="flex-1">{r.label}</span>
              <span className="text-xs text-slate-500">{r.type}</span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
