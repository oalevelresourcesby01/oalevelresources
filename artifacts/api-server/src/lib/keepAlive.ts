import { logger } from "./logger";

// Render's free plan spins down web services after ~15 minutes of no
// inbound HTTP traffic. A self-ping keeps traffic flowing so the service
// never goes idle in the first place — external services (e.g. UptimeRobot)
// can also hit the same /api/healthz endpoint, but this gives a working
// default with zero extra setup.
const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes — safely under the 15 min idle timeout

function resolveSelfUrl(): string | undefined {
  // RENDER_EXTERNAL_URL is set automatically by Render for every web service.
  const renderUrl = process.env["RENDER_EXTERNAL_URL"];
  if (renderUrl) return renderUrl;

  // Allow an explicit override for other hosts (or local testing).
  const explicit = process.env["SELF_PING_URL"];
  if (explicit) return explicit;

  return undefined;
}

export function startKeepAlive(): void {
  if (process.env["NODE_ENV"] !== "production") {
    return;
  }

  const baseUrl = resolveSelfUrl();
  if (!baseUrl) {
    logger.warn(
      "Keep-alive self-ping disabled: no RENDER_EXTERNAL_URL or SELF_PING_URL found.",
    );
    return;
  }

  const healthUrl = new URL("/api/healthz", baseUrl).toString();

  const ping = async () => {
    try {
      const res = await fetch(healthUrl, { method: "GET" });
      logger.info({ status: res.status }, "Keep-alive self-ping");
    } catch (err) {
      logger.warn({ err }, "Keep-alive self-ping failed");
    }
  };

  logger.info({ healthUrl, intervalMs: PING_INTERVAL_MS }, "Keep-alive self-ping started");

  // Fire on a recurring interval; unref so it never blocks process exit.
  const timer = setInterval(ping, PING_INTERVAL_MS);
  timer.unref();
}
