"use client";

import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Search, Flag } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BadgePill } from "./badge-pill";
import { useEntityFields } from "../hooks/use-entity-fields";

export type RecordDoc = Doc<"records">;

/**
 * Master list panel (left column) for any entity type. Badges and
 * subtitles are derived from the admin-managed `showInList` fields.
 */
export function RecordListPanel({
  entityTypeKey,
  selectedId,
  onSelect,
  subtitle,
  stageFilter,
  emptyLabel = "No records found",
  className,
}: {
  entityTypeKey: string;
  selectedId: Id<"records"> | null;
  onSelect: (id: Id<"records">) => void;
  subtitle?: (record: RecordDoc) => string;
  stageFilter?: string;
  emptyLabel?: string;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const { listFields } = useEntityFields(entityTypeKey);

  const paginated = usePaginatedQuery(
    api.records.list,
    search === ""
      ? { entityTypeKey, stage: stageFilter }
      : "skip",
    { initialNumItems: 50 },
  );
  const searchResults = useQuery(
    api.records.search,
    search === "" ? "skip" : { entityTypeKey, query: search },
  );

  const records: Array<RecordDoc> =
    search === "" ? paginated.results : (searchResults ?? []);
  const isLoading =
    search === ""
      ? paginated.status === "LoadingFirstPage"
      : searchResults === undefined;

  const defaultSubtitle = (record: RecordDoc): string => {
    const parts: Array<string> = [];
    for (const def of listFields) {
      const value = record.fields[def.key];
      if (def.type === "text" && typeof value === "string") {
        parts.push(value);
      }
    }
    return parts.join(" · ");
  };

  return (
    <div
      className={cn(
        "h-full w-full shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex lg:w-80",
        className,
      )}
    >
      <div className="border-b border-zinc-100 p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-9 pl-8"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">{emptyLabel}</p>
        ) : (
          <>
            <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
              {records.length}
              {search === "" && paginated.status !== "Exhausted" ? "+" : ""} shown
            </p>
            <ul>
              {records.map((record) => {
                const pills: Array<string> = [];
                for (const def of listFields) {
                  const value = record.fields[def.key];
                  if (def.type === "select" && typeof value === "string") {
                    pills.push(value);
                  }
                  if (def.type === "multiselect" && Array.isArray(value)) {
                    pills.push(...(value as Array<string>).slice(0, 2));
                  }
                }
                return (
                  <li key={record._id}>
                    <button
                      onClick={() => onSelect(record._id)}
                      className={cn(
                        "w-full border-l-2 border-transparent px-4 py-3 text-left transition-colors hover:bg-zinc-50",
                        selectedId === record._id &&
                          "border-indigo-500 bg-indigo-50/60",
                      )}
                    >
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                        {record.name}
                        {record.flagged && (
                          <Flag className="size-3 fill-amber-500 text-amber-500" />
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {(subtitle ?? defaultSubtitle)(record)}
                      </p>
                      {pills.length > 0 && (
                        <p className="mt-1.5 flex flex-wrap gap-1">
                          {pills.slice(0, 3).map((pill, i) => (
                            <BadgePill key={`${pill}-${i}`} value={pill} />
                          ))}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {search === "" && paginated.status === "CanLoadMore" && (
              <div className="p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => paginated.loadMore(50)}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
