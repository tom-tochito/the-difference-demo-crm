"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
} from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-dvh flex-1 bg-zinc-100">
          <div className="hidden w-56 bg-[#101f2c] lg:block" />
          <div className="flex-1 space-y-4 p-4 sm:p-8">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <RedirectToLogin />
      </Unauthenticated>
      <Authenticated>
        <AppShell>{children}</AppShell>
      </Authenticated>
    </>
  );
}
