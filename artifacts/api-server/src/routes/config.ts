import { Router } from "express";
import { getAllConfig, updateManyConfig } from "../lib/config";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/config — public-safe fields only
router.get("/config", async (req, res) => {
  const cfg = await getAllConfig();
  res.json({
    appName: cfg.appName,
    whatsappChannel: cfg.whatsappChannel,
    aboutUs: cfg.aboutUs,
    contactEmail: cfg.contactEmail,
    contactPhone: cfg.contactPhone,
    maintenanceMode: cfg.maintenanceMode === "true",
    aiEnabled: cfg.aiEnabled === "true",
    aiSystemPrompt: cfg.aiSystemPrompt,
    aiModel: cfg.aiModel,
    theme: cfg.theme,
  });
});

// GET /api/config/admin — full config (admin only)
router.get("/config/admin", requireAuth, async (req, res) => {
  const cfg = await getAllConfig();
  res.json({
    appName: cfg.appName,
    driveRootFolderId: cfg.driveRootFolderId,
    whatsappChannel: cfg.whatsappChannel,
    aboutUs: cfg.aboutUs,
    contactEmail: cfg.contactEmail,
    contactPhone: cfg.contactPhone,
    maintenanceMode: cfg.maintenanceMode === "true",
    aiEnabled: cfg.aiEnabled === "true",
    aiSystemPrompt: cfg.aiSystemPrompt,
    aiModel: cfg.aiModel,
    theme: cfg.theme,
    syncIntervalMinutes: parseInt(cfg.syncIntervalMinutes || "60", 10),
    autoSync: cfg.autoSync === "true",
    cacheEnabled: cfg.cacheEnabled === "true",
    cacheTtlMinutes: parseInt(cfg.cacheTtlMinutes || "30", 10),
    maxDownloadSizeMb: parseInt(cfg.maxDownloadSizeMb || "100", 10),
    openRouterApiKeySet: !!cfg.openRouterApiKey,
    driveApiKeySet: !!cfg.driveApiKey,
  });
});

// PUT /api/config/admin — update config (admin only)
router.put("/config/admin", requireAuth, async (req, res) => {
  const body = req.body as Record<string, unknown>;

  const updates: Record<string, string> = {};

  if (typeof body.appName === "string") updates.appName = body.appName;
  if (typeof body.driveRootFolderId === "string") updates.driveRootFolderId = body.driveRootFolderId;
  if (typeof body.driveApiKey === "string") updates.driveApiKey = body.driveApiKey;
  if (typeof body.openRouterApiKey === "string") updates.openRouterApiKey = body.openRouterApiKey;
  if (typeof body.whatsappChannel === "string") updates.whatsappChannel = body.whatsappChannel;
  if (typeof body.aboutUs === "string") updates.aboutUs = body.aboutUs;
  if (typeof body.contactEmail === "string") updates.contactEmail = body.contactEmail;
  if (typeof body.contactPhone === "string") updates.contactPhone = body.contactPhone;
  if (typeof body.maintenanceMode === "boolean") updates.maintenanceMode = String(body.maintenanceMode);
  if (typeof body.aiEnabled === "boolean") updates.aiEnabled = String(body.aiEnabled);
  if (typeof body.aiSystemPrompt === "string") updates.aiSystemPrompt = body.aiSystemPrompt;
  if (typeof body.aiModel === "string") updates.aiModel = body.aiModel;
  if (typeof body.theme === "string") updates.theme = body.theme;
  if (typeof body.syncIntervalMinutes === "number") updates.syncIntervalMinutes = String(body.syncIntervalMinutes);
  if (typeof body.autoSync === "boolean") updates.autoSync = String(body.autoSync);
  if (typeof body.cacheEnabled === "boolean") updates.cacheEnabled = String(body.cacheEnabled);
  if (typeof body.cacheTtlMinutes === "number") updates.cacheTtlMinutes = String(body.cacheTtlMinutes);
  if (typeof body.maxDownloadSizeMb === "number") updates.maxDownloadSizeMb = String(body.maxDownloadSizeMb);

  await updateManyConfig(updates as any);

  const cfg = await getAllConfig();
  res.json({
    appName: cfg.appName,
    driveRootFolderId: cfg.driveRootFolderId,
    whatsappChannel: cfg.whatsappChannel,
    aboutUs: cfg.aboutUs,
    contactEmail: cfg.contactEmail,
    contactPhone: cfg.contactPhone,
    maintenanceMode: cfg.maintenanceMode === "true",
    aiEnabled: cfg.aiEnabled === "true",
    aiSystemPrompt: cfg.aiSystemPrompt,
    aiModel: cfg.aiModel,
    theme: cfg.theme,
    syncIntervalMinutes: parseInt(cfg.syncIntervalMinutes || "60", 10),
    autoSync: cfg.autoSync === "true",
    cacheEnabled: cfg.cacheEnabled === "true",
    cacheTtlMinutes: parseInt(cfg.cacheTtlMinutes || "30", 10),
    maxDownloadSizeMb: parseInt(cfg.maxDownloadSizeMb || "100", 10),
    openRouterApiKeySet: !!cfg.openRouterApiKey,
    driveApiKeySet: !!cfg.driveApiKey,
  });
});

export default router;
