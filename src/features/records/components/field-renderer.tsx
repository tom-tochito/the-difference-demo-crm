"use client";

import Link from "next/link";
import { formatDate, formatGBPFull } from "@/lib/format";
import { BadgePill } from "./badge-pill";
import type { FieldDef } from "../hooks/use-entity-fields";

/** Display-mode renderer for a single dynamic field value. */
export function FieldRenderer({
  def,
  value,
  relationName,
}: {
  def: FieldDef;
  value: unknown;
  relationName?: string;
}) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-zinc-400">—</span>;
  }
  switch (def.type) {
    case "currency":
      return <span className="tabular-nums">{formatGBPFull(value as number)}</span>;
    case "date":
      return <span>{formatDate(value as number)}</span>;
    case "number":
      return <span className="tabular-nums">{value as number}</span>;
    case "select":
      return <BadgePill value={String(value)} />;
    case "multiselect":
      return (
        <span className="flex flex-wrap gap-1">
          {(value as Array<string>).map((item) => (
            <BadgePill key={item} value={item} />
          ))}
        </span>
      );
    case "relation": {
      const target =
        def.relationTo === "organisation"
          ? "/organisations"
          : def.relationTo === "contact"
            ? "/contacts"
            : null;
      const label = relationName ?? "View record";
      return target ? (
        <Link
          href={`${target}?id=${String(value)}`}
          className="font-medium text-indigo-600 hover:underline"
        >
          {label}
        </Link>
      ) : (
        <span>{label}</span>
      );
    }
    case "url":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 hover:underline"
        >
          {String(value)}
        </a>
      );
    case "email":
      return (
        <a
          href={`mailto:${String(value)}`}
          className="text-indigo-600 hover:underline"
        >
          {String(value)}
        </a>
      );
    default:
      return <span className="whitespace-pre-wrap">{String(value)}</span>;
  }
}
