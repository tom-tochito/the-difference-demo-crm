export const clientNavigation = [
  ["overview", "Home"],
  ["enquiries", "Requests"],
  ["quotes", "Quotes & bookings"],
  ["shipments", "Shipments"],
  ["documents", "Documents"],
  ["finance", "Invoices"],
] as const;

export function clientHref(
  section: string,
  query: Record<string, string> = {},
  previewCustomer?: string,
) {
  const params = new URLSearchParams(query);
  if (previewCustomer) {
    params.set("customer", previewCustomer);
    params.set("view", section);
  }
  const path = previewCustomer
    ? "/shipping/portal"
    : `/shipping${section === "overview" ? "" : `/${section}`}`;
  return `${path}${params.size ? `?${params}` : ""}`;
}
