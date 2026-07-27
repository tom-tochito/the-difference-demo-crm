"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [convex] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!),
  );
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
