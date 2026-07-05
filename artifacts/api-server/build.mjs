import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["./src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "./dist/index.mjs",
  sourcemap: true,
  // Never bundle third-party packages: many of them (express, pg, debug,
  // body-parser, etc.) are CJS internally and use dynamic require() calls
  // that esbuild cannot translate into a bundled ESM file. Leaving all
  // node_modules packages external and letting Node's own CJS/ESM
  // interop resolve them at runtime avoids "Dynamic require of X is not
  // supported" errors in production.
  packages: "external",
});
