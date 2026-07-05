import { Router } from "express";
import bcrypt from "bcryptjs";
import { getConfig, setConfig } from "../lib/config";
import { signToken, bumpTokenVersion } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { dbLog } from "../lib/dbLogger";

const router = Router();

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const [configUsername, configHashRaw] = await Promise.all([
    getConfig("adminUsername"),
    getConfig("adminPasswordHash"),
  ]);

  // No password hash stored yet — only allow if ADMIN_DEFAULT_PASSWORD env var is set
  if (!configHashRaw) {
    // Trim whitespace: env vars pasted into hosting dashboards (Render,
    // etc.) frequently pick up a trailing newline/space, which would
    // otherwise cause every initial-setup login attempt to fail with a
    // confusing "Invalid username or password" error.
    const defaultPw = process.env["ADMIN_DEFAULT_PASSWORD"]?.trim();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!defaultPw) {
      res.status(503).json({
        error: "No admin password configured. Set ADMIN_DEFAULT_PASSWORD env var to perform initial login.",
      });
      return;
    }
    if (trimmedUsername !== configUsername || trimmedPassword !== defaultPw) {
      dbLog("warn", "Failed initial-setup login", `username=${username}`);
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    // Hash and persist the password so subsequent logins use bcrypt
    const hash = await bcrypt.hash(defaultPw, 12);
    await setConfig("adminPasswordHash", hash);
    dbLog("info", "Admin password initialised from ADMIN_DEFAULT_PASSWORD");

    const token = await signToken({ username, role: "admin" });
    res.json({ token, expiresIn: 7 * 24 * 3600, user: { username, role: "admin" } });
    return;
  }

  const valid =
    username === configUsername &&
    (await bcrypt.compare(password, configHashRaw));

  if (!valid) {
    dbLog("warn", "Failed login attempt", `username=${username}`);
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = await signToken({ username, role: "admin" });
  dbLog("info", "Admin login successful", `username=${username}`);

  res.json({
    token,
    expiresIn: 7 * 24 * 3600,
    user: { username, role: "admin" },
  });
});

// POST /api/auth/logout
router.post("/auth/logout", requireAuth, async (req, res) => {
  await bumpTokenVersion(); // invalidate all existing tokens
  dbLog("info", "Admin logout");
  res.json({ success: true, message: "Logged out" });
});

// PUT /api/auth/change-password
router.put("/auth/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both passwords are required" });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const hashRaw = await getConfig("adminPasswordHash");
  if (!hashRaw) {
    res.status(409).json({ error: "Password not yet initialised — login first" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, hashRaw);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await setConfig("adminPasswordHash", newHash);
  await bumpTokenVersion(); // invalidate all tokens
  dbLog("info", "Admin password changed");

  res.json({ success: true, message: "Password changed successfully" });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, (req, res) => {
  const admin = (req as any).admin;
  res.json({ username: admin.username, role: admin.role });
});

export default router;
