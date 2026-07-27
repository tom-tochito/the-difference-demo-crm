import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  suffix,
  note,
  noteColor = "text-emerald-600",
}: {
  label: string;
  value: string;
  suffix?: string;
  note?: string;
  noteColor?: string;
}) {
  return (
    <Card className="py-4 transition-shadow hover:shadow-md">
      <CardContent className="px-4">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">
          {value}
          {suffix && (
            <span className="text-base font-medium text-zinc-400">{suffix}</span>
          )}
        </p>
        {note && (
          <p className={cn("mt-1 flex items-center gap-1 text-xs", noteColor)}>
            <span className="size-1.5 rounded-full bg-current" />
            {note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
