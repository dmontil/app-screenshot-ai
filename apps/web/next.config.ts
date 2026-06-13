import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: [
    "@app-screenshot-ai/ai-pipeline",
    "@app-screenshot-ai/local-project-store",
    "@app-screenshot-ai/model-gateway",
    "@app-screenshot-ai/pattern-library",
    "@app-screenshot-ai/schemas",
  ],
};

export default nextConfig;
