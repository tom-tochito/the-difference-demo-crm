"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { ShieldCheck, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DEMO_PASSWORD = "demo2026!";

const DEMO_ACCOUNTS = [
  {
    key: "admin",
    email: "admin@demo.thedifference.org",
    label: "Sign in as Admin",
    description: "Full access — can edit entity fields like a CMS",
    icon: ShieldCheck,
  },
  {
    key: "user",
    email: "user@demo.thedifference.org",
    label: "Sign in as User",
    description: "Standard access — browse and edit records",
    icon: User,
  },
] as const;

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const handleSignIn = async (email: string, key: string) => {
    setPending(key);
    try {
      await signIn("password", {
        email,
        password: DEMO_PASSWORD,
        flow: "signIn",
      });
      router.push("/dashboard");
    } catch {
      toast.error("Sign-in failed. Has the demo data been seeded?");
      setPending(null);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-[#1c1b27] p-6">
      {/* Atmosphere: soft indigo glows + faint grid, matching the sidebar tone */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 400px at 20% 10%, oklch(0.45 0.18 275 / 0.25), transparent 70%), radial-gradient(500px 380px at 85% 85%, oklch(0.5 0.15 300 / 0.18), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="rise-children relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
            The Difference
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">CRM</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Demo · Convex + flexible schemas
          </p>
        </div>
        <div className="space-y-3">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.key}
              onClick={() => handleSignIn(account.email, account.key)}
              disabled={pending !== null}
              className="h-auto w-full justify-start gap-3 rounded-xl bg-white/95 px-4 py-3 text-left text-zinc-900 transition-transform hover:-translate-y-0.5 hover:bg-white"
            >
              {pending === account.key ? (
                <Loader2 className="size-5 shrink-0 animate-spin" />
              ) : (
                <account.icon className="size-5 shrink-0 text-indigo-600" />
              )}
              <span className="flex flex-col">
                <span className="font-semibold">{account.label}</span>
                <span className="text-xs font-normal text-zinc-500">
                  {account.description}
                </span>
              </span>
            </Button>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-zinc-500">
          One-click demo accounts · password{" "}
          <code className="rounded bg-white/10 px-1 py-0.5">{DEMO_PASSWORD}</code>
        </p>
      </div>
    </div>
  );
}
