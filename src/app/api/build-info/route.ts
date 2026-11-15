// Public build identifiers only. Used to verify that the live domain serves the pushed commit.
export const dynamic = "force-static";
export function GET() {
  return Response.json({
    commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "local",
    build: process.env.NEXT_PUBLIC_BUILD_ID ?? "local",
  });
}
