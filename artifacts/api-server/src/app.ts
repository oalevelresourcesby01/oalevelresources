import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
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

// The public-facing website (landing page, browse, search, AI chat for PC/web
// users) is a separate SPA built from artifacts/web, served at the root path.
const webDistDir = path.resolve(currentDir, "..", "..", "web", "dist", "public");
const webDistExists = fs.existsSync(path.join(webDistDir, "index.html"));

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
// 20mb accommodates a ~15MB image/PDF attachment from the AI chat after
// base64 inflation (~33% larger than the raw file).
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Hashed asset filenames (e.g. index-AbC123.js) are safe to cache forever;
// index.html is not hashed, so it must always be revalidated — otherwise
// browsers (and any intermediary proxy) can keep serving an old SPA shell
// that references a bundle from a previous deploy indefinitely.
const staticAssetOptions = {
  setHeaders(res: Response, filePath: string) {
    if (path.basename(filePath) === "index.html") {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    } else {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
};

if (adminDistExists) {
  app.use("/admin", express.static(adminDistDir, staticAssetOptions));

  // SPA fallback: any non-API /admin/* route serves index.html so
  // client-side routing (react-router, etc.) works on hard refresh.
  app.get("/admin/*splat", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(adminDistDir, "index.html"));
  });

} else {
  logger.warn(
    { adminDistDir },
    "Admin frontend build not found — skipping static file serving. " +
      "Run `pnpm --filter @workspace/admin run build` before deploying.",
  );
}

if (webDistExists) {
  app.use(express.static(webDistDir, staticAssetOptions));

  // SPA fallback for the public site's client-side routes (react-router).
  // Registered after /admin and /api so it never shadows them.
  app.get("/*splat", (req, res, next) => {
    if (req.path.startsWith("/admin") || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(webDistDir, "index.html"));
  });
} else {
  logger.warn(
    { webDistDir },
    "Public web frontend build not found — falling back to redirecting '/' to /admin/. " +
      "Run `pnpm --filter @workspace/web run build` before deploying.",
  );
  app.get("/", (_req, res) => {
    res.redirect("/admin/");
  });
}

// Global error handler — must be registered last, with 4 args, so Express
// recognizes it as an error handler. Without this, Express falls back to
// its default HTML error page (a bare "Internal Server Error" <pre> block)
// which hides the actual error message from both the client and the logs.
app.use(
  (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err, url: req.url, method: req.method }, "Unhandled request error");
    if (res.headersSent) return;
    const message = err instanceof Error ? err.message : "Internal Server Error";
    res.status(500).json({ error: message });
  },
);

export default app;
