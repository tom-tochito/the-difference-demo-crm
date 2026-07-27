import { cn } from "@/lib/utils";

// Semantic colours first, then a stable hash into a soft palette so
// admin-created select options get consistent colours automatically.
const SEMANTIC: Record<string, string> = {
  Warm: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Very warm": "bg-emerald-100 text-emerald-800 ring-emerald-600/30",
  Cold: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  Lapsed: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Successful: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Unsuccessful: "bg-red-50 text-red-700 ring-red-600/20",
  Stewarding: "bg-sky-50 text-sky-700 ring-sky-600/20",
  Received: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Part received": "bg-teal-50 text-teal-700 ring-teal-600/20",
  Due: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Pledged: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  Overdue: "bg-red-50 text-red-700 ring-red-600/20",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Open: "bg-sky-50 text-sky-700 ring-sky-600/20",
  Green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Red: "bg-red-50 text-red-700 ring-red-600/20",
  Secured: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Done: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Declined: "bg-red-50 text-red-700 ring-red-600/20",
};

const PALETTE = [
  "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "bg-amber-50 text-amber-700 ring-amber-600/20",
  "bg-sky-50 text-sky-700 ring-sky-600/20",
  "bg-violet-50 text-violet-700 ring-violet-600/20",
  "bg-rose-50 text-rose-700 ring-rose-600/20",
  "bg-teal-50 text-teal-700 ring-teal-600/20",
  "bg-orange-50 text-orange-700 ring-orange-600/20",
];

function hashColor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function BadgePill({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        SEMANTIC[value] ?? hashColor(value),
        className,
      )}
    >
      {value}
    </span>
  );
}
