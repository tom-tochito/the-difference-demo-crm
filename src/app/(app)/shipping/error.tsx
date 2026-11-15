"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="m-8 rounded-xl border bg-white p-8">
      <h1 className="text-xl font-semibold">
        Freight workspace could not load
      </h1>
      <p className="my-4 text-sm text-zinc-600">
        Please retry. If this continues, check the backend connection and that
        the freight demo has been initialized.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
