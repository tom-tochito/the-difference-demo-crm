import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

const DEMO_EMAILS = [
  "admin@demo.thedifference.org",
  "user@demo.thedifference.org",
];

const PasswordWithRole = Password<DataModel>({
  profile(params) {
    const email = params.email as string;
    // Public deployment: only the seeded demo accounts may exist.
    if (params.flow === "signUp" && !DEMO_EMAILS.includes(email)) {
      throw new ConvexError("Sign-up is disabled on this demo.");
    }
    return {
      email,
      name: params.name as string | undefined,
      role: (params.role as "admin" | "user" | undefined) ?? "user",
      team: params.team as string | undefined,
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [PasswordWithRole],
});
