import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// In production the admin frontend is built separately (see render.yaml)
// and its static output lives at artifacts/admin/dist/public. This api
// server is the only web service deployed on Render, so it also serves
// the admin SPA under /admin/ (matching the admin app's Vite `base`).
const adminDistDir = path.resolve(
  currentDir,
  "..",
  "..",
  "admin",
  "dist",
  "public",
);
const adminDistExists = fs.existsSync(
  path.join(adminDistDir, "index.html"),
);

// NOTE: runMigrations() and startAutoSync() are called from index.ts
// with top-level await before this module is used.

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (adminDistExists) {
  app.use("/admin", express.static(adminDistDir));

  // SPA fallback: any non-API /admin/* route serves index.html so
  // client-side routing (react-router, etc.) works on hard refresh.
  app.get("/admin/*splat", (_req, res) => {
    res.sendFile(path.join(adminDistDir, "index.html"));
  });

  // Redirect the root to the admin UI for convenience.
  app.get("/", (_req, res) => {
    res.redirect("/admin/");
  });
} else {
  logger.warn(
    { adminDistDir },
    "Admin frontend build not found — skipping static file serving. " +
      "Run `pnpm --filter @workspace/admin run build` before deploying.",
  );
}

export default app;
