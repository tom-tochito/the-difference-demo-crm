import { Suspense } from "react";
import { ShippingApp } from "@/features/shipping/shipping-app";
export default function Page() { return <Suspense fallback={<div className="p-8">Loading freight workspace…</div>}><ShippingApp section="enquiries"/></Suspense>; }
