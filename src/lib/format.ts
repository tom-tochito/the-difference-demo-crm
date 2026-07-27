export function formatGBP(minor: number | undefined | null): string {
  if (minor === undefined || minor === null) return "—";
  const pounds = minor / 100;
  if (Math.abs(pounds) >= 1000) {
    return `£${Math.round(pounds / 1000).toLocaleString("en-GB")}k`;
  }
  return `£${pounds.toLocaleString("en-GB")}`;
}

export function formatGBPFull(minor: number | undefined | null): string {
  if (minor === undefined || minor === null) return "—";
  return `£${(minor / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

export function formatDate(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return "—";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRelative(ms: number, now: number): string {
  const diff = now - ms;
  const days = Math.round(Math.abs(diff) / (24 * 60 * 60 * 1000));
  const suffix = diff >= 0 ? "ago" : "from now";
  if (days === 0) return "today";
  if (days === 1) return diff >= 0 ? "yesterday" : "tomorrow";
  if (days < 7) return `${days} days ${suffix}`;
  if (days < 30) return `${Math.round(days / 7)} week${days >= 14 ? "s" : ""} ${suffix}`;
  if (days < 365) return `${Math.round(days / 30)} month${days >= 60 ? "s" : ""} ${suffix}`;
  return `${Math.round(days / 365)} year${days >= 730 ? "s" : ""} ${suffix}`;
}

export function daysBetween(from: number, to: number): number {
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
