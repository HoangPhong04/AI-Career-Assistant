// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   experimental: {},
//   // Disable auto-generated AGENTS.md / CLAUDE.md on every dev & build run.
//   agentRules: false,
// };

// export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
