import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import type {
  AiFileAction,
  ConnectedFile,
  ConnectedProviderFile,
} from "@vk/contracts";
import { config } from "./config.js";
import {
  getConnectedAccount,
  saveAiFileAction,
  saveConnectedAccount,
  saveConnectedFile,
  updateConnectedAccount,
} from "./db.js";

type Provider = "google" | "figma";
type FileType = "docs" | "sheets" | "slides" | "figma";

type OAuthState = {
  provider: Provider;
  createdAt: number;
};

const oauthStates = new Map<string, OAuthState>();
const localUserId = "local-user";

const googleScopes = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/presentations",
];

const figmaScopes = ["file_metadata:read", "file_content:read"];

function key() {
  return createHash("sha256")
    .update(`${config.localSecret}:karsadesk-connected-accounts`)
    .digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decrypt(value: string) {
  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted)
    throw new Error("Unsupported encrypted token format");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function configured(provider: Provider) {
  if (provider === "google") {
    return Boolean(
      config.connectedProviders.google.clientId &&
      config.connectedProviders.google.clientSecret,
    );
  }
  return Boolean(
    (config.connectedProviders.figma.clientId &&
      config.connectedProviders.figma.clientSecret) ||
    config.connectedProviders.figma.personalAccessToken,
  );
}

export function connectedProviderConfigStatus() {
  return {
    google: configured("google"),
    figma: configured("figma"),
  };
}

function oauthCallbackPage(title: string, message: string) {
  const safeTitle = title.replace(/[<>&"]/g, "");
  const safeMessage = message.replace(/[<>&"]/g, "");
  return `<!doctype html><html><head><title>${safeTitle}</title><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="font-family:system-ui;padding:24px;line-height:1.5"><h1>${safeTitle}</h1><p>${safeMessage}</p><p>You can close this tab and return to KarsaDesk.</p><script>try{window.opener&&window.opener.postMessage({source:"karsadesk",type:"provider-connected"},"*")}catch(e){};</script></body></html>`;
}

function rememberState(provider: Provider) {
  const state = randomUUID();
  oauthStates.set(state, { provider, createdAt: Date.now() });
  return state;
}

function consumeState(state: string, provider: Provider) {
  const item = oauthStates.get(state);
  oauthStates.delete(state);
  if (
    !item ||
    item.provider !== provider ||
    Date.now() - item.createdAt > 10 * 60_000
  ) {
    throw new Error("OAuth state is invalid or expired");
  }
}

export function googleStartUrl() {
  if (!configured("google")) {
    return {
      configured: false,
      url: null,
      message:
        "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first.",
    };
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.connectedProviders.google.clientId);
  url.searchParams.set(
    "redirect_uri",
    config.connectedProviders.google.redirectUri,
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", googleScopes.join(" "));
  url.searchParams.set("state", rememberState("google"));
  return {
    configured: true,
    url: url.toString(),
    message: "Open this URL to connect Google Workspace.",
  };
}

export function figmaStartUrl() {
  if (
    !config.connectedProviders.figma.clientId ||
    !config.connectedProviders.figma.clientSecret
  ) {
    return {
      configured: false,
      url: null,
      message:
        "Set FIGMA_CLIENT_ID and FIGMA_CLIENT_SECRET, or use FIGMA_PERSONAL_ACCESS_TOKEN/PAT connect.",
    };
  }
  const url = new URL("https://www.figma.com/oauth");
  url.searchParams.set("client_id", config.connectedProviders.figma.clientId);
  url.searchParams.set(
    "redirect_uri",
    config.connectedProviders.figma.redirectUri,
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", figmaScopes.join(" "));
  url.searchParams.set("state", rememberState("figma"));
  return {
    configured: true,
    url: url.toString(),
    message: "Open this URL to connect Figma.",
  };
}

async function postForm<T>(url: string, values: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    error_description?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(
      body.error_description ||
        body.message ||
        body.error ||
        `OAuth failed (${response.status})`,
    );
  }
  return body;
}

export async function handleGoogleCallback(query: {
  code?: string;
  state?: string;
  error?: string;
}) {
  if (query.error)
    return oauthCallbackPage("Google connection failed", query.error);
  if (!query.code || !query.state)
    return oauthCallbackPage(
      "Google connection failed",
      "Missing OAuth code/state.",
    );
  consumeState(query.state, "google");
  const token = await postForm<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  }>("https://oauth2.googleapis.com/token", {
    code: query.code,
    client_id: config.connectedProviders.google.clientId,
    client_secret: config.connectedProviders.google.clientSecret,
    redirect_uri: config.connectedProviders.google.redirectUri,
    grant_type: "authorization_code",
  });
  const now = new Date();
  saveConnectedAccount({
    uid: getConnectedAccount("google")?.uid || randomUUID(),
    userId: localUserId,
    provider: "google",
    accessToken: encrypt(token.access_token),
    refreshToken: token.refresh_token
      ? encrypt(token.refresh_token)
      : getConnectedAccount("google")?.refreshToken || null,
    tokenType: token.token_type || "Bearer",
    scopes: token.scope?.split(/\s+/).filter(Boolean) || googleScopes,
    expiresAt: token.expires_in
      ? new Date(now.getTime() + token.expires_in * 1000).toISOString()
      : null,
    accountLabel: "Google Workspace account",
    status: "connected",
    metadata: { connectedVia: "oauth" },
    createdAt: getConnectedAccount("google")?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  });
  return oauthCallbackPage(
    "Google connected",
    "Google Workspace is connected to KarsaDesk.",
  );
}

export async function handleFigmaCallback(query: {
  code?: string;
  state?: string;
  error?: string;
}) {
  if (query.error)
    return oauthCallbackPage("Figma connection failed", query.error);
  if (!query.code || !query.state)
    return oauthCallbackPage(
      "Figma connection failed",
      "Missing OAuth code/state.",
    );
  consumeState(query.state, "figma");
  const token = await postForm<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  }>("https://api.figma.com/v1/oauth/token", {
    code: query.code,
    client_id: config.connectedProviders.figma.clientId,
    client_secret: config.connectedProviders.figma.clientSecret,
    redirect_uri: config.connectedProviders.figma.redirectUri,
    grant_type: "authorization_code",
  });
  saveFigmaToken(token.access_token, {
    refreshToken: token.refresh_token || null,
    expiresIn: token.expires_in || null,
    scopes: token.scope?.split(/\s+/).filter(Boolean) || figmaScopes,
    connectedVia: "oauth",
  });
  return oauthCallbackPage(
    "Figma connected",
    "Figma is connected to KarsaDesk.",
  );
}

export function connectFigmaPat(token?: string) {
  const value =
    token?.trim() || config.connectedProviders.figma.personalAccessToken;
  if (!value) {
    throw new Error(
      "Provide a Figma personal access token or set FIGMA_PERSONAL_ACCESS_TOKEN.",
    );
  }
  saveFigmaToken(value, {
    refreshToken: null,
    expiresIn: null,
    scopes: figmaScopes,
    connectedVia: "personal_access_token",
  });
}

function saveFigmaToken(
  accessToken: string,
  options: {
    refreshToken: string | null;
    expiresIn: number | null;
    scopes: string[];
    connectedVia: "oauth" | "personal_access_token";
  },
) {
  const now = new Date();
  const existing = getConnectedAccount("figma");
  saveConnectedAccount({
    uid: existing?.uid || randomUUID(),
    userId: localUserId,
    provider: "figma",
    accessToken: encrypt(accessToken),
    refreshToken: options.refreshToken
      ? encrypt(options.refreshToken)
      : existing?.refreshToken || null,
    tokenType:
      options.connectedVia === "oauth" ? "Bearer" : "PersonalAccessToken",
    scopes: options.scopes,
    expiresAt: options.expiresIn
      ? new Date(now.getTime() + options.expiresIn * 1000).toISOString()
      : null,
    accountLabel:
      options.connectedVia === "oauth" ? "Figma account" : "Figma PAT account",
    status: "connected",
    metadata: { connectedVia: options.connectedVia },
    createdAt: existing?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

async function googleAccessToken() {
  const account = getConnectedAccount("google");
  if (!account) throw new Error("Google is not connected");
  if (
    account.expiresAt &&
    new Date(account.expiresAt).getTime() < Date.now() + 60_000
  ) {
    if (!account.refreshToken) {
      updateConnectedAccount("google", { status: "token_expired" });
      throw new Error("Google token expired. Reconnect Google.");
    }
    const token = await postForm<{
      access_token: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
    }>("https://oauth2.googleapis.com/token", {
      client_id: config.connectedProviders.google.clientId,
      client_secret: config.connectedProviders.google.clientSecret,
      refresh_token: decrypt(account.refreshToken),
      grant_type: "refresh_token",
    });
    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : account.expiresAt;
    updateConnectedAccount("google", {
      accessToken: encrypt(token.access_token),
      expiresAt,
      scopes: token.scope?.split(/\s+/).filter(Boolean) || account.scopes,
      status: "connected",
    });
    return token.access_token;
  }
  return decrypt(account.accessToken);
}

function figmaAccess() {
  const account = getConnectedAccount("figma");
  if (!account) throw new Error("Figma is not connected");
  if (account.expiresAt && new Date(account.expiresAt).getTime() < Date.now()) {
    updateConnectedAccount("figma", { status: "token_expired" });
    throw new Error("Figma token expired. Reconnect Figma.");
  }
  return {
    token: decrypt(account.accessToken),
    tokenType: account.tokenType,
  };
}

async function apiJson<T>(
  url: string,
  init: RequestInit,
  provider: Provider,
): Promise<T> {
  const response = await fetch(url, init);
  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : {};
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      updateConnectedAccount(provider, {
        status:
          response.status === 401 ? "token_expired" : "missing_permission",
      });
    throw new Error(
      body?.error?.message ||
        body?.message ||
        body?.err ||
        `${provider} API failed (${response.status})`,
    );
  }
  return body as T;
}

function googleFileType(mimeType: string): FileType {
  if (mimeType.includes("spreadsheet")) return "sheets";
  if (mimeType.includes("presentation")) return "slides";
  return "docs";
}

function googleMime(fileType: FileType) {
  if (fileType === "sheets") return "application/vnd.google-apps.spreadsheet";
  if (fileType === "slides") return "application/vnd.google-apps.presentation";
  return "application/vnd.google-apps.document";
}

function googleOpenUrl(fileType: FileType, fileId: string) {
  if (fileType === "sheets")
    return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
  if (fileType === "slides")
    return `https://docs.google.com/presentation/d/${fileId}/edit`;
  return `https://docs.google.com/document/d/${fileId}/edit`;
}

export async function listGoogleFiles(
  query = "",
): Promise<ConnectedProviderFile[]> {
  const token = await googleAccessToken();
  const filters = [
    "trashed = false",
    `mimeType in ('${googleMime("docs")}','${googleMime("sheets")}','${googleMime("slides")}')`,
  ];
  const trimmed = query.trim().replace(/'/g, "\\'");
  if (trimmed) filters.push(`name contains '${trimmed}'`);
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", filters.join(" and "));
  url.searchParams.set("pageSize", "25");
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set(
    "fields",
    "files(id,name,mimeType,webViewLink,thumbnailLink,iconLink,modifiedTime,owners(displayName,emailAddress),lastModifyingUser(displayName,emailAddress))",
  );
  const result = await apiJson<{
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      webViewLink?: string;
      thumbnailLink?: string;
      iconLink?: string;
      modifiedTime?: string;
      owners?: Array<{ displayName?: string; emailAddress?: string }>;
      lastModifyingUser?: { displayName?: string; emailAddress?: string };
    }>;
  }>(
    url.toString(),
    { headers: { Authorization: `Bearer ${token}` } },
    "google",
  );
  return (result.files || []).map((file) => {
    const fileType = googleFileType(file.mimeType);
    return {
      provider: "google",
      fileType,
      externalFileId: file.id,
      externalFileUrl: file.webViewLink || googleOpenUrl(fileType, file.id),
      fileName: file.name,
      thumbnailUrl: file.thumbnailLink || file.iconLink || null,
      status: "synced",
      metadata: {
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime || null,
        owner:
          file.owners?.[0]?.displayName ||
          file.owners?.[0]?.emailAddress ||
          null,
        lastModifyingUser:
          file.lastModifyingUser?.displayName ||
          file.lastModifyingUser?.emailAddress ||
          null,
      },
    };
  });
}

export async function getGoogleFile(
  fileId: string,
): Promise<ConnectedProviderFile> {
  const token = await googleAccessToken();
  const url = new URL(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
  );
  url.searchParams.set(
    "fields",
    "id,name,mimeType,webViewLink,thumbnailLink,iconLink,modifiedTime,owners(displayName,emailAddress),lastModifyingUser(displayName,emailAddress)",
  );
  const file = await apiJson<{
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
    thumbnailLink?: string;
    iconLink?: string;
    modifiedTime?: string;
    owners?: Array<{ displayName?: string; emailAddress?: string }>;
    lastModifyingUser?: { displayName?: string; emailAddress?: string };
  }>(
    url.toString(),
    { headers: { Authorization: `Bearer ${token}` } },
    "google",
  );
  const fileType = googleFileType(file.mimeType);
  return {
    provider: "google",
    fileType,
    externalFileId: file.id,
    externalFileUrl: file.webViewLink || googleOpenUrl(fileType, file.id),
    fileName: file.name,
    thumbnailUrl: file.thumbnailLink || file.iconLink || null,
    status: "synced",
    metadata: {
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime || null,
      owner:
        file.owners?.[0]?.displayName || file.owners?.[0]?.emailAddress || null,
      lastModifyingUser:
        file.lastModifyingUser?.displayName ||
        file.lastModifyingUser?.emailAddress ||
        null,
    },
  };
}

export async function readGoogleFileText(file: ConnectedFile) {
  const token = await googleAccessToken();
  const mimeType = file.fileType === "sheets" ? "text/csv" : "text/plain";
  const url = new URL(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.externalFileId)}/export`,
  );
  url.searchParams.set("mimeType", mimeType);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      updateConnectedAccount("google", {
        status:
          response.status === 401 ? "token_expired" : "missing_permission",
      });
    throw new Error(`Google export failed (${response.status})`);
  }
  return (await response.text()).slice(0, 20_000);
}

function figmaHeaders(): Record<string, string> {
  const access = figmaAccess();
  return access.tokenType === "PersonalAccessToken"
    ? { "X-Figma-Token": access.token }
    : { Authorization: `Bearer ${access.token}` };
}

export async function getFigmaFile(
  fileKey: string,
): Promise<ConnectedProviderFile> {
  const url = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/meta`;
  const response = await apiJson<{
    file: {
      name: string;
      last_touched_at?: string;
      thumbnail_url?: string;
      editorType?: string;
      version?: string;
      role?: string;
      link_access?: string;
      url?: string;
      creator?: { handle?: string; email?: string };
      last_touched_by?: { handle?: string; email?: string };
    };
  }>(url, { headers: figmaHeaders() }, "figma");
  return {
    provider: "figma",
    fileType: "figma",
    externalFileId: fileKey,
    externalFileUrl:
      response.file.url || `https://www.figma.com/file/${fileKey}`,
    fileName: response.file.name,
    thumbnailUrl: response.file.thumbnail_url || null,
    status: "synced",
    metadata: {
      lastModified: response.file.last_touched_at || null,
      editorType: response.file.editorType || null,
      version: response.file.version || null,
      role: response.file.role || null,
      linkAccess: response.file.link_access || null,
      creator:
        response.file.creator?.handle || response.file.creator?.email || null,
      lastTouchedBy:
        response.file.last_touched_by?.handle ||
        response.file.last_touched_by?.email ||
        null,
    },
  };
}

export async function readFigmaFileSummary(file: ConnectedFile) {
  const url = new URL(
    `https://api.figma.com/v1/files/${encodeURIComponent(file.externalFileId)}`,
  );
  url.searchParams.set("depth", "2");
  const data = await apiJson<{
    name?: string;
    lastModified?: string;
    thumbnailUrl?: string;
    document?: {
      name?: string;
      children?: Array<{
        name?: string;
        type?: string;
        children?: Array<{ name?: string; type?: string }>;
      }>;
    };
  }>(url.toString(), { headers: figmaHeaders() }, "figma");
  const pages = data.document?.children || [];
  return [
    `Figma file: ${data.name || file.fileName}`,
    `Last modified: ${data.lastModified || file.metadata.lastModified || "unknown"}`,
    `Pages: ${pages.map((page) => page.name || "Untitled").join(", ") || "unknown"}`,
    "",
    ...pages.slice(0, 8).map((page) => {
      const children = page.children
        ?.slice(0, 12)
        .map((child) => `${child.type}: ${child.name}`)
        .join("; ");
      return `Page ${page.name || "Untitled"}: ${children || "No top-level nodes returned"}`;
    }),
  ].join("\n");
}

export async function syncConnectedFileMetadata(file: ConnectedFile) {
  const latest =
    file.provider === "google"
      ? await getGoogleFile(file.externalFileId)
      : await getFigmaFile(file.externalFileId);
  const value: ConnectedFile = {
    ...file,
    fileType: latest.fileType,
    externalFileUrl: latest.externalFileUrl,
    fileName: latest.fileName,
    thumbnailUrl: latest.thumbnailUrl,
    metadata: latest.metadata,
    status: "synced",
    updatedAt: new Date().toISOString(),
  };
  saveConnectedFile(value);
  return value;
}

export async function readConnectedFileContext(file: ConnectedFile) {
  if (file.provider === "figma") return readFigmaFileSummary(file);
  return readGoogleFileText(file);
}

export async function createAiFileActionWithContext(args: {
  taskUid: string;
  file: ConnectedFile;
  prompt: string;
  actionType: string;
  applyMode: "preview" | "auto_apply";
}) {
  const now = new Date().toISOString();
  let status: AiFileAction["status"] = "needs_confirmation";
  let resultSummary = "";
  let errorMessage: string | null = null;
  try {
    const context = await readConnectedFileContext(args.file);
    const contextPreview = context.trim()
      ? context.trim().slice(0, 8_000)
      : "No readable text/context was returned by the provider API.";
    const risk =
      args.applyMode === "auto_apply"
        ? "Auto-apply was requested, but KarsaDesk keeps provider-file edits in preview mode until explicit apply adapters are enabled."
        : "Preview mode: no original file was modified.";
    const providerPlan =
      args.file.provider === "google"
        ? [
            "Google action plan:",
            "- Read current file context through Google Drive export/API.",
            "- Draft exact edits in a reviewable preview before changing Docs/Sheets/Slides.",
            "- Apply through official Docs/Sheets/Slides API only after user confirmation.",
          ].join("\n")
        : [
            "Figma action plan:",
            "- Read file metadata/tree through Figma REST API.",
            "- Produce design/wireframe/slicing instructions for review.",
            "- Direct canvas mutation is reserved for the future Figma Plugin bridge.",
          ].join("\n");
    resultSummary = [
      `AI file action prepared for ${args.file.fileName}.`,
      `Instruction: ${args.prompt}`,
      "",
      providerPlan,
      "",
      "Provider context preview:",
      contextPreview,
      "",
      risk,
    ].join("\n");
  } catch (error) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message : String(error);
    resultSummary = `Could not prepare AI action for ${args.file.fileName}.`;
  }
  const action: AiFileAction = {
    uid: randomUUID(),
    taskUid: args.taskUid,
    connectedFileUid: args.file.uid,
    userId: localUserId,
    prompt: args.prompt,
    actionType: args.actionType,
    status,
    resultSummary,
    errorMessage,
    createdAt: now,
    updatedAt: now,
  };
  saveAiFileAction(action);
  return action;
}
