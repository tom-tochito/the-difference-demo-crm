"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import {
  LayoutGrid,
  Users,
  Building2,
  Gem,
  Workflow,
  BookOpen,
  Megaphone,
  Landmark,
  Settings2,
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  CommandPalette,
  useCommandPalette,
} from "@/components/command-palette";

const DISABLED_PORTALS = [
  { label: "Partnerships", icon: Workflow },
  { label: "ILC", icon: BookOpen },
  { label: "DSP", icon: BookOpen },
  { label: "Policy", icon: Landmark },
  { label: "Comms", icon: Megaphone },
];

function NavLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100",
        active && "bg-indigo-500/15 text-white",
      )}
    >
      {active && (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-indigo-400" />
      )}
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </p>
  );
}

function SidebarContent({
  onNavigate,
  onSearch,
}: {
  onNavigate?: () => void;
  onSearch?: () => void;
}) {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <div className="flex h-full flex-col bg-[#1c1b27] text-zinc-300">
      <div className="px-5 pb-2 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
          The Difference
        </p>
        <p className="text-xl font-bold text-white">CRM</p>
        <p className="text-[11px] text-zinc-500">Demo · Convex</p>
      </div>
      {onSearch && (
        <div className="px-3 pt-3">
          <button
            onClick={onSearch}
            className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[13px] text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-300"
          >
            <Search className="size-3.5" />
            Search…
            <kbd className="ml-auto rounded border border-white/10 px-1 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <SectionLabel>Overview</SectionLabel>
        <NavLink href="/dashboard" label="Dashboard" icon={LayoutGrid} onNavigate={onNavigate} />
        <SectionLabel>Relationships</SectionLabel>
        <NavLink href="/contacts" label="All contacts" icon={Users} onNavigate={onNavigate} />
        <NavLink href="/organisations" label="Organisations" icon={Building2} onNavigate={onNavigate} />
        <SectionLabel>Portals</SectionLabel>
        <NavLink href="/fundraising" label="Fundraising" icon={Gem} onNavigate={onNavigate} />
        {DISABLED_PORTALS.map((portal) => (
          <span
            key={portal.label}
            title="Not in demo scope"
            className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-zinc-600"
          >
            <portal.icon className="size-4" />
            {portal.label}
            <span className="ml-auto rounded border border-white/10 px-1 py-px text-[9px] uppercase tracking-wide text-zinc-600">
              soon
            </span>
          </span>
        ))}
        {user?.role === "admin" && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavLink href="/admin/fields" label="Entity fields" icon={Settings2} onNavigate={onNavigate} />
          </>
        )}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-indigo-500/30 text-xs text-indigo-100">
              {user ? initials(user.name) : "…"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-zinc-100">
              {user?.name ?? "Loading…"}
            </p>
            <Badge
              variant="outline"
              className="mt-0.5 h-4 border-white/20 px-1.5 text-[10px] uppercase tracking-wide text-zinc-400"
            >
              {user?.role ?? ""}
            </Badge>
          </div>
          <button
            onClick={() => {
              void signOut().then(() => router.push("/login"));
            }}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-1 bg-zinc-100">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 lg:block">
          <SidebarContent onSearch={() => setPaletteOpen(true)} />
        </aside>

        {/* Mobile top bar + drawer */}
        <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 bg-[#1c1b27] px-3 text-white lg:hidden">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                className="rounded-md p-2 text-zinc-300 transition-colors hover:bg-white/10"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 bg-[#1c1b27] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="leading-tight">
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
              The Difference
            </p>
            <p className="text-sm font-bold">CRM</p>
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto rounded-md p-2 text-zinc-300 transition-colors hover:bg-white/10"
            aria-label="Search"
          >
            <Search className="size-5" />
          </button>
        </header>

        <main className="flex min-h-dvh min-w-0 flex-1 flex-col pt-14 lg:ml-56 lg:pt-0">
          {children}
        </main>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </TooltipProvider>
  );
}
