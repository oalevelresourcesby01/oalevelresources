import { pool } from "../db/index";

export type ConfigKey =
  | "adminUsername"
  | "adminPasswordHash"
  | "jwtSecret"
  | "jwtVersion"
  | "driveApiKey"
  | "driveRootFolderId"
  | "openRouterApiKey"
  | "aiEnabled"
  | "aiModel"
  | "aiSystemPrompt"
  | "appName"
  | "whatsappChannel"
  | "aboutUs"
  | "contactEmail"
  | "contactPhone"
  | "maintenanceMode"
  | "theme"
  | "autoSync"
  | "syncIntervalMinutes"
  | "cacheEnabled"
  | "cacheTtlMinutes"
  | "maxDownloadSizeMb"
  | (string & {});

export async function getConfig(key: ConfigKey): Promise<string> {
  const { rows } = await pool.query(
    "SELECT value FROM config WHERE key = $1",
    [key]
  );
  return rows[0]?.value ?? "";
}

export async function setConfig(key: ConfigKey, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const { rows } = await pool.query("SELECT key, value FROM config");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function updateManyConfig(
  updates: Partial<Record<ConfigKey, string>>
): Promise<void> {
  const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
  }
}
