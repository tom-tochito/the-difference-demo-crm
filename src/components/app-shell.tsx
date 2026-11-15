"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import {
  ArrowRightLeft,
  LayoutDashboard,
  Ship,
  FileText,
  ClipboardList,
  Wallet,
  ChartNoAxesCombined,
  Database,
  Users,
  Building2,
  Settings2,
  LogOut,
  Menu,
  Search,
  Compass,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { clientNavigation, clientHref } from "@/features/shipping/navigation";
export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.currentUser);
  const path = usePathname();
  const params = useSearchParams();
  const preview = user?.role === "superadmin" && path === "/shipping/portal";
  const team = useQuery(api.platform.team, preview ? {} : "skip");
  const previewCompany =
    team?.companies.find((c) => c.id === params.get("customer")) ??
    team?.companies[0];
  const previewView = params.get("view") ?? "overview";
  const { signOut } = useAuthActions();
  const [drawer, setDrawer] = useState(false);
  const { open, setOpen } = useCommandPalette();
  if (user === undefined)
    return <div className="p-12">Opening your workspace…</div>;
  if (!user)
    return (
      <div className="m-auto max-w-md p-8">
        <h1 className="text-2xl">This account is unavailable</h1>
        <p className="my-4 text-sm text-slate-600">
          Sign in with an active Freight Operations demo account.
        </p>
        <button className="underline" onClick={() => signOut()}>
          Return to sign in
        </button>
      </div>
    );
  if (preview && !team)
    return (
      <div className="p-8 text-sm text-slate-600">Opening client preview…</div>
    );
  const platform = user.role === "superadmin";
  const client = !platform || preview;
  const icons = [
    LayoutDashboard,
    ClipboardList,
    FileText,
    Ship,
    FileText,
    Wallet,
  ];
  const groups = [
    {
      label: client ? "Your workspace" : "Operations",
      items: client
        ? clientNavigation.map(([slug, label], i) => [slug, label, icons[i]])
        : [
            ["overview", "Home", LayoutDashboard],
            ["customers", "Customers & partners", Building2],
            ["enquiries", "Requests", ClipboardList],
            ["quotes", "Quotations", FileText],
            ["bookings", "Bookings", ArrowRightLeft],
            ["shipments", "Shipments", Ship],
            ["documents", "Documents", FileText],
            ["tasks", "Tasks & exceptions", ClipboardList],
            ["finance", "Finance", Wallet],
            ["reports", "Reports", ChartNoAxesCombined],
          ],
    },
    {
      label: "More",
      items: [
        ...(platform && !preview
          ? [["portal", "Client preview", Compass]]
          : []),
        ...(!preview && user.role !== "user" ? [["team", "Team", Users]] : []),
        ["sources", "Data sources", Database],
        ...(platform && !preview
          ? [["settings", "Demo settings", Settings2]]
          : []),
      ],
    },
  ];
  const sidebar = (
    <div className="flex h-full flex-col bg-[#101f2c] text-slate-300">
      <Link
        href={clientHref("overview", {}, previewCompany?.id)}
        className="flex items-center gap-3 px-6 pt-7 pb-5"
        onClick={() => setDrawer(false)}
      >
        <span className="flex size-10 items-center justify-center rounded-xl border border-teal-300/30 bg-teal-300/10 text-teal-200">
          <Compass className="size-6" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          Freight
          <span className="block text-[10px] font-normal uppercase tracking-[.26em] text-slate-400">
            Operations
          </span>
        </span>
      </Link>
      <div className="mx-4 mb-4 rounded-lg border border-white/10 px-3 py-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">
          {preview
            ? "Read-only client preview"
            : platform
              ? "Platform workspace"
              : "Client workspace"}
        </p>
        <p className="mt-1 truncate text-xs text-white">
          {previewCompany?.name ?? user.company ?? "All client organisations"}
        </p>
      </div>
      {!preview && (
        <button
          onClick={() => {
            setDrawer(false);
            setOpen(true);
          }}
          className="mx-4 mb-1 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300"
        >
          <Search className="size-3.5" />
          Search your workspace <span className="ml-auto text-[10px]">⌘K</span>
        </button>
      )}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-3 pt-5 pb-2 text-[9px] font-medium uppercase tracking-[.2em] text-slate-400">
              {g.label}
            </p>
            {g.items.map(([slug, label, Icon]) => {
              const href = clientHref(
                String(slug),
                {},
                preview ? previewCompany?.id : undefined,
              );
              const selected = preview
                ? previewView
                : path.split("/").at(-1) === "shipping"
                  ? "overview"
                  : path.split("/").at(-1);
              const active =
                selected === slug ||
                (client && slug === "quotes" && selected === "bookings");
              const I = Icon as typeof Ship;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setDrawer(false)}
                  className={`my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors ${active ? "bg-teal-300/10 text-teal-100 ring-1 ring-inset ring-teal-300/15" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <I className="size-4 opacity-80" />
                  {label as string}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        {preview && (
          <Link
            href="/shipping"
            className="mb-4 block text-xs font-medium text-teal-200"
          >
            ← Exit client preview
          </Link>
        )}
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-slate-700 text-xs text-white">
            {user.name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-white">{user.name}</p>
            <p className="mt-1 text-[9px] uppercase tracking-widest text-slate-400">
              {user.role} · Demo
            </p>
          </div>
          <button
            aria-label="Sign out"
            className="rounded p-1 hover:bg-white/10"
            onClick={() => signOut()}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="flex min-h-dvh flex-1 bg-[#f6f7f5]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 lg:block">
        {sidebar}
      </aside>
      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center gap-3 bg-[#101f2c] px-4 text-white lg:hidden">
        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetTrigger asChild>
            <button aria-label="Open navigation">
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-0 bg-[#101f2c] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {sidebar}
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium">Freight Operations</span>
        {!preview && (
          <button
            aria-label="Search"
            className="ml-auto"
            onClick={() => setOpen(true)}
          >
            <Search className="size-4" />
          </button>
        )}
      </header>
      <main
        id="main"
        className="min-h-dvh min-w-0 flex-1 pt-16 lg:ml-60 lg:pt-0"
      >
        <div className="hidden h-14 items-center justify-between border-b border-slate-200/80 bg-white/60 px-8 text-[11px] text-slate-600 lg:flex">
          <span>
            {platform ? "Freight Operations" : user.company}{" "}
            <span className="mx-3 text-slate-300">/</span>{" "}
            {path.split("/").at(-1) === "shipping"
              ? "Home"
              : path
                  .split("/")
                  .at(-1)
                  ?.replace(/^./, (x) => x.toUpperCase())}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-teal-600" />
            Illustrative demo · No live transactions
          </span>
        </div>
        {children}
      </main>
      {!preview && <CommandPalette open={open} onOpenChange={setOpen} />}
    </div>
  );
}
