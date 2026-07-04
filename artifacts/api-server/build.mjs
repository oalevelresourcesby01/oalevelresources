import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["./src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "./dist/index.mjs",
  sourcemap: true,
  // All native / CJS modules must stay external
  external: [
    "bcryptjs",
    "jsonwebtoken",
    "uuid",
    "node-cron",
    // pino ships workers/threads at runtime — keep it external
    "pino",
    "pino-http",
    "pino-pretty",
    "thread-stream",
    "sonic-boom",
  ],
});
