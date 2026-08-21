import type { NextConfig } from "next";

import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) =>
  initOpenNextCloudflareForDev(),
);

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default nextConfig;
