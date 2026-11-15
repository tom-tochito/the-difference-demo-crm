"use client";
import { useState, useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowUpRight,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../../../convex/demoAccounts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export default function Login() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const [pending, setPending] = useState("");
  useEffect(() => {
    if (isAuthenticated) router.replace("/shipping");
  }, [isAuthenticated, router]);
  async function login(email: string, password = DEMO_PASSWORD) {
    setPending(email);
    try {
      await signIn("password", { email, password, flow: "signIn" });
    } catch {
      toast.error("Sign-in failed. Check your demo credentials.");
      setPending("");
    }
  }
  return (
    <div className="grid min-h-dvh w-full bg-[#f6f7f5] lg:grid-cols-[1.05fr_1fr]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-[#101f2c] px-8 py-10 text-white sm:px-14 lg:py-14">
        <div className="flex items-center gap-3 text-lg font-medium">
          <Compass className="size-8 text-teal-300" />
          Freight Operations
        </div>
        <div className="relative z-10 my-14 max-w-lg">
          <p className="mb-7 text-[10px] uppercase tracking-[.3em] text-teal-200">
            Intelligent freight. Measurable value.
          </p>
          <h1 className="text-5xl font-medium leading-[1.08] tracking-[-.04em] sm:text-6xl">
            Move goods.
            <br />
            Keep more
            <br />
            <span className="text-teal-200">of the value.</span>
          </h1>
          <p className="mt-7 max-w-sm text-sm leading-7 text-slate-300">
            A connected workspace for better freight decisions. Compare costs,
            coordinate shipments and turn operational insight into customer
            savings.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-6 text-xs">
            <span>
              Cost clarity
              <ArrowUpRight className="mt-3 size-4 text-teal-200" />
            </span>
            <span>
              Client control
              <ShieldCheck className="mt-3 size-4 text-teal-200" />
            </span>
            <span>
              Connected work
              <Compass className="mt-3 size-4 text-teal-200" />
            </span>
          </div>
        </div>
        <p className="text-[10px] leading-5 text-slate-400">
          Interactive demonstration · Fictional data and public demo
          credentials.
          <br />
          No live rates, bookings or financial transactions.
        </p>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-36 top-28 size-[500px] rounded-full border border-white/5"
        >
          <div className="m-16 size-[360px] rounded-full border border-white/5" />
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-teal-700">
            Explore the platform
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Choose your perspective.
          </h2>
          <p className="mt-3 mb-8 text-sm leading-6 text-slate-600">
            Each account has its own permissions and workspace. Explore the
            platform team or step into an importer’s day.
          </p>
          {["", "Alder & Finch Exports", "Northstar Ceramics"].map(
            (company) => (
              <div
                className="mb-4 rounded-xl border border-slate-200 bg-white p-4"
                key={company}
              >
                <p className="mb-3 text-xs font-semibold text-slate-700">
                  {company || "Platform team"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEMO_ACCOUNTS.filter((a) => a.company === company).map(
                    (a) => (
                      <Button
                        key={a.email}
                        variant={
                          a.role === "superadmin" ? "default" : "outline"
                        }
                        size="sm"
                        disabled={!!pending}
                        onClick={() => login(a.email)}
                        aria-label={a.label}
                      >
                        {pending === a.email ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : a.role === "superadmin" ? (
                          "Superadmin"
                        ) : (
                          a.label.split(" · ")[1]
                        )}
                        <ArrowRight className="size-3" />
                      </Button>
                    ),
                  )}
                </div>
              </div>
            ),
          )}
          <details className="mt-6 text-xs text-slate-600">
            <summary className="cursor-pointer">
              Sign in with another demo account
            </summary>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                login(String(f.get("email")), String(f.get("password")));
              }}
            >
              <input
                className="h-10 w-full rounded border bg-white px-3"
                name="email"
                type="email"
                aria-label="Email"
                placeholder="you@company.example"
                required
              />
              <input
                className="h-10 w-full rounded border bg-white px-3"
                name="password"
                type="password"
                aria-label="Password"
                required
                placeholder="Demo password"
              />
              <Button disabled={!!pending}>Sign in</Button>
            </form>
            <p className="mt-3">Demo password: {DEMO_PASSWORD}</p>
          </details>
        </div>
      </div>
    </div>
  );
}
