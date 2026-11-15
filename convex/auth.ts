import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

const PasswordWithRole = Password<DataModel>({
  profile(params) {
    if (params.flow !== "signIn")
      throw new ConvexError(
        "Public sign-up is disabled. Use a provisioned demo account.",
      );
    return { email: String(params.email) };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [PasswordWithRole],
});
