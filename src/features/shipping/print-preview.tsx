"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { company, date, money, useShipping } from "./shared";
import { total, type Charge } from "../../../convex/shippingModel";
export type PrintRequest = {
  type: string;
  record: {
    reference: string;
    customerId: string;
    origin?: string;
    destination?: string;
    cargo?: string;
    packages?: number;
    weightKg?: number;
    volumeM3?: number;
    dimensions?: string;
    currency: string;
    charges: Charge[];
    incoterm?: string;
    validity?: number;
    dueAt?: number;
  };
};
export function PrintPreview({
  request,
  close,
}: {
  request: PrintRequest;
  close: () => void;
}) {
  const { data } = useShipping();
  const r = request.record;
  const packing = request.type === "Packing list";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="print-document max-h-[90dvh] overflow-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{request.type}</DialogTitle>
          <DialogDescription>
            Printable sample · Use your browser’s Save as PDF option to
            download.
          </DialogDescription>
        </DialogHeader>
        <div className="print-sheet space-y-7 bg-white p-3 text-zinc-900">
          <div className="flex justify-between border-b-2 border-indigo-600 pb-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
                Freight Operations
              </p>
              <h2 className="mt-2 text-3xl font-semibold">{request.type}</h2>
            </div>
            <div className="text-right text-sm">
              <p className="font-mono">{r.reference}</p>
              <p>{company(data, r.customerId)}</p>
            </div>
          </div>
          <p className="rounded border-2 border-rose-200 p-3 text-center text-sm font-bold tracking-wide text-rose-700">
            DEMO — NOT VALID FOR SHIPPING
          </p>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs uppercase text-zinc-600">Customer</p>
              <p>{company(data, r.customerId)}</p>
              <p>
                {data.companies.find((c) => c._id === r.customerId)?.address}
              </p>
            </div>
            <div>
              <p>
                {r.origin} {r.destination && "→"} {r.destination}
              </p>
              {r.incoterm && <p>Incoterm: {r.incoterm}</p>}
              {r.validity && <p>Valid until: {date(r.validity)}</p>}
              {r.dueAt && <p>Due: {date(r.dueAt)}</p>}
            </div>
          </div>
          {r.cargo && <p className="text-sm">Cargo: {r.cargo}</p>}
          {packing ? (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Packages", "Gross weight", "Volume", "Dimensions"].map(
                    (s) => (
                      <th className="border-b p-2 text-left" key={s}>
                        {s}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2">{r.packages}</td>
                  <td>{r.weightKg} kg</td>
                  <td>{r.volumeM3} m³</td>
                  <td>{r.dimensions}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {[
                      "Description",
                      "Qty",
                      `Rate (${r.currency})`,
                      "Amount",
                    ].map((s) => (
                      <th key={s} className="border-b p-2 text-left">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.charges.map((c, i) => (
                    <tr key={i}>
                      <td className="border-b p-2">{c.description}</td>
                      <td className="border-b p-2">{c.quantity}</td>
                      <td className="border-b p-2">
                        {money(c.unitMinor, r.currency)}
                      </td>
                      <td className="border-b p-2">
                        {money(
                          Math.round(c.quantity * c.unitMinor),
                          r.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-right text-xl font-semibold">
                Total {money(total(r.charges), r.currency)}
              </p>
            </>
          )}
          <p className="border-t pt-4 text-xs leading-5 text-zinc-600">
            Illustrative demo values only. No live freight rates, tax
            determination or customs advice. Sample commercial invoices use
            recorded demo charges; they are not a valuation of goods. No goods
            may be shipped using this document.
          </p>
        </div>
        <Button
          className="print:hidden"
          onClick={() => {
            const sheet = document.querySelector(".print-sheet");
            const popup = window.open("", "_blank");
            if (!sheet || !popup) {
              toast.error("Allow pop-ups to open the printable document.");
              return;
            }
            popup.opener = null;
            popup.document
              .write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Freight Operations — Demo document</title><style>
            @page { margin: 15mm; } * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #18181b; margin: 0 auto; max-width: 800px; padding: 24px; line-height: 1.5; }
            h2 { font-size: 28px; margin: 8px 0; } p { margin: 6px 0; }
            .print-sheet > * + * { margin-top: 24px; }
            .print-sheet > div:first-child { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; }
            .print-sheet > div:nth-of-type(2) { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .print-sheet > p:first-of-type { border: 2px solid #fecdd3; color: #be123c; font-weight: 700; text-align: center; padding: 12px; }
            .print-sheet > p:last-child { font-size: 11px; color: #52525b; border-top: 1px solid #ddd; padding-top: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; } th, td { border-bottom: 1px solid #ddd; text-align: left; padding: 10px 6px; }
            .text-right { text-align: right; } .text-xs { font-size: 11px; color: #52525b; } .text-sm { font-size: 13px; } .text-xl { font-size: 20px; } .font-semibold { font-weight: 600; }
            @media print { body { padding: 0; } }
          </style></head><body>${sheet.outerHTML}</body></html>`);
            popup.document.close();
            popup.focus();
            popup.print();
          }}
        >
          Print / Save as PDF
        </Button>
      </DialogContent>
    </Dialog>
  );
}
