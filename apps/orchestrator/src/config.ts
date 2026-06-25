import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const dataDir =
  process.env.VK_DATA_DIR?.trim() || path.join(os.homedir(), ".karsadesk");

export const config = {
  host: process.env.VK_ORCHESTRATOR_HOST || "127.0.0.1",
  port: Number(process.env.VK_ORCHESTRATOR_PORT || 4317),
  allowedOrigins: (
    process.env.VK_ALLOWED_ORIGINS ||
    "http://127.0.0.1:3456,http://localhost:3456"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  localSecret:
    process.env.VK_LOCAL_SECRET ||
    "local-development-secret-change-before-sharing",
  dataDir,
  worktreeDir:
    process.env.VK_WORKTREE_DIR?.trim() || path.join(dataDir, "worktrees"),
  logRetentionDays: Number(process.env.VK_LOG_RETENTION_DAYS || 30),
  opencodeBin: process.env.OPENCODE_BIN?.trim() || "opencode",
  connectedProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
      redirectUri:
        process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
        "http://127.0.0.1:4317/api/connect/google/callback",
    },
    figma: {
      clientId: process.env.FIGMA_CLIENT_ID?.trim() || "",
      clientSecret: process.env.FIGMA_CLIENT_SECRET?.trim() || "",
      redirectUri:
        process.env.FIGMA_OAUTH_REDIRECT_URI?.trim() ||
        "http://127.0.0.1:4317/api/connect/figma/callback",
      personalAccessToken:
        process.env.FIGMA_PERSONAL_ACCESS_TOKEN?.trim() || "",
    },
  },
  nocodb: {
    baseUrl: (process.env.NOCODB_BASE_URL || "https://app.nocodb.com").replace(
      /\/$/,
      "",
    ),
    workspaceId: process.env.NOCODB_WORKSPACE_ID || "",
    baseId: process.env.NOCODB_BASE_ID || "",
    token: process.env.NOCODB_API_TOKEN || "",
  },
};

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.worktreeDir, { recursive: true });
fs.mkdirSync(path.join(config.dataDir, "logs"), { recursive: true });
