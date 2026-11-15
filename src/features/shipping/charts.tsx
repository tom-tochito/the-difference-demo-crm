"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useShipping, money, Panel, date } from "./shared";
export function VolumeChart() {
  const { data, now } = useShipping();
  const rows = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - 4 + i, 1);
    const month = d.toISOString().slice(0, 7);
    const shipments = data.shipments.filter((s) =>
      new Date(s.etd).toISOString().startsWith(month),
    );
    return {
      name: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
      Sea: shipments.filter((s) => s.mode === "sea").length,
      Air: shipments.filter((s) => s.mode === "air").length,
      Road: shipments.filter((s) => s.mode === "road").length,
    };
  });
  return (
    <Panel
      title="Shipment volume"
      action={<span className="text-xs text-zinc-600">By departure month</span>}
    >
      <div className="h-56 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid vertical={false} stroke="#f0f0f2" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              fontSize={11}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={25}
              fontSize={11}
            />
            <Tooltip />
            <Bar dataKey="Sea" stackId="a" fill="#0f766e" />
            <Bar dataKey="Air" stackId="a" fill="#a5b4fc" />
            <Bar
              dataKey="Road"
              stackId="a"
              fill="#d4d4d8"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-zinc-600">
        Sea · Air · Road · All values come from shipment records.
      </p>
    </Panel>
  );
}
export function RevenueChart({ currency }: { currency: string }) {
  const { data, now } = useShipping();
  const rows = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - 5 + i, 1);
    const key = d.toISOString().slice(0, 7);
    return {
      name: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
      Revenue:
        data.invoices
          .filter(
            (inv) =>
              inv.issued &&
              inv.currency === currency &&
              inv.issuedAt &&
              new Date(inv.issuedAt).toISOString().startsWith(key),
          )
          .reduce((s, inv) => s + inv.total, 0) / 100,
    };
  });
  return (
    <Panel
      title={`Invoiced revenue · ${currency}`}
      action={<span className="text-xs text-zinc-600">Excludes drafts</span>}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid vertical={false} stroke="#f0f0f2" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              fontSize={11}
            />
            <YAxis axisLine={false} tickLine={false} fontSize={10} width={48} />
            <Tooltip formatter={(v) => money(Number(v) * 100, currency)} />
            <Bar dataKey="Revenue" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-zinc-600">
        By invoice issue month · As of {date(now)}
      </p>
    </Panel>
  );
}
