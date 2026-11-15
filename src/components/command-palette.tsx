"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Building2, Gem, TrendingUp, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const GROUPS = [
  {
    key: "contact",
    label: "Contacts",
    icon: Users,
    href: (id: string) => `/contacts?id=${id}`,
  },
  {
    key: "organisation",
    label: "Organisations",
    icon: Building2,
    href: (id: string) => `/organisations?id=${id}`,
  },
  {
    key: "gift",
    label: "Gifts",
    icon: Gem,
    href: () => `/fundraising?tab=gifts`,
  },
  {
    key: "pipeline",
    label: "Pipeline",
    icon: TrendingUp,
    href: () => `/fundraising?tab=pipeline`,
  },
] as const;

/**
 * Global search (⌘K / Ctrl+K) across every entity type, backed by the
 * Convex search index over the flexible records.
 */
function CharityCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery("");
    onOpenChange(next);
  };

  const contacts = useQuery(
    api.records.search,
    open && query !== "" ? { entityTypeKey: "contact", query } : "skip",
  );
  const organisations = useQuery(
    api.records.search,
    open && query !== "" ? { entityTypeKey: "organisation", query } : "skip",
  );
  const gifts = useQuery(
    api.records.search,
    open && query !== "" ? { entityTypeKey: "gift", query } : "skip",
  );
  const pipeline = useQuery(
    api.records.search,
    open && query !== "" ? { entityTypeKey: "pipeline", query } : "skip",
  );
  const resultsByKey = {
    contact: contacts,
    organisation: organisations,
    gift: gifts,
    pipeline: pipeline,
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search"
      description="Search contacts, organisations, gifts and pipeline"
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search contacts, orgs, funders, deals…"
        />
        <CommandList>
          {query === "" ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Type to search across every record type.
            </p>
          ) : (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {GROUPS.map((group) => {
            const results = resultsByKey[group.key] ?? [];
            if (results.length === 0) return null;
            return (
              <CommandGroup key={group.key} heading={group.label}>
                {results.slice(0, 5).map((record) => (
                  <CommandItem
                    key={record._id}
                    value={record._id}
                    onSelect={() => {
                      handleOpenChange(false);
                      router.push(group.href(record._id));
                    }}
                  >
                    <group.icon className="size-4 text-zinc-400" />
                    <span className="truncate">{record.name}</span>
                    {record.stage && (
                      <span className="ml-auto text-xs text-zinc-400">
                        {record.stage}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

/** Registers the global ⌘K / Ctrl+K shortcut and renders the palette. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return { open, setOpen };
}

export function CommandPalette(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipping?: boolean;
}) {
  return props.shipping ? (
    <FreightCommandPalette
      open={props.open}
      onOpenChange={props.onOpenChange}
    />
  ) : (
    <CharityCommandPalette {...props} />
  );
}
function FreightCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const results = useQuery(
    api.shipping.search,
    open && query.trim() ? { text: query } : "skip",
  );
  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setQuery("");
      }}
      title="Search freight"
      description="Search freight customers, quotes and shipments"
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search freight records…"
        />
        <CommandList>
          <CommandEmpty>
            {query
              ? "No matching freight records."
              : "Search by company, reference or route."}
          </CommandEmpty>
          {results?.map((r) => (
            <CommandItem
              key={r.id}
              value={r.id}
              onSelect={() => {
                onOpenChange(false);
                setQuery("");
                router.push(r.href);
              }}
            >
              <span>{r.label}</span>
              <span className="ml-auto text-xs text-zinc-400">{r.type}</span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
