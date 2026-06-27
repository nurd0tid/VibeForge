"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  Figma,
  Loader2,
  Paperclip,
  Plug,
  Presentation,
  RefreshCw,
  Search,
  Sheet,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AiFileAction,
  ConnectedAccountPublic,
  ConnectedFile,
  ConnectedProviderFile,
  Task,
} from "@vk/contracts";
import type { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { cn } from "@/lib/utils";

type Payload = { files: ConnectedFile[]; actions: AiFileAction[] };
type AccountPayload = {
  google: ConnectedAccountPublic;
  figma: ConnectedAccountPublic;
};

const field =
  "w-full rounded-lg border border-border bg-panel px-3 py-2 text-xs outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15";

function fileIcon(file: Pick<ConnectedFile, "provider" | "fileType">) {
  if (file.provider === "figma") return Figma;
  if (file.fileType === "sheets") return Sheet;
  if (file.fileType === "slides") return Presentation;
  return FileText;
}

function providerLabel(file: Pick<ConnectedFile, "provider" | "fileType">) {
  return file.provider === "figma"
    ? "Figma"
    : file.fileType === "sheets"
      ? "Google Sheets"
      : file.fileType === "slides"
        ? "Google Slides"
        : "Google Docs";
}

function statusTone(status: string) {
  if (["connected", "synced"].includes(status))
    return "border-success/30 bg-success/10 text-success";
  if (["not_connected", "not_configured"].includes(status))
    return "border-warning/30 bg-warning/10 text-warning";
  return "border-danger/30 bg-danger/10 text-danger";
}

export function ConnectedFilesPanel({
  api,
  task,
}: {
  api: ApiClient | null;
  task: Task;
}) {
  const [files, setFiles] = useState<ConnectedFile[]>([]);
  const [actions, setActions] = useState<AiFileAction[]>([]);
  const [accounts, setAccounts] = useState<AccountPayload | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedFileUid, setSelectedFileUid] = useState("");
  const [googleQuery, setGoogleQuery] = useState("");
  const [googleFiles, setGoogleFiles] = useState<ConnectedProviderFile[]>([]);
  const [figmaPat, setFigmaPat] = useState("");
  const [busy, setBusy] = useState(false);
  const [providerBusy, setProviderBusy] = useState(false);
  const selectedFile = useMemo(
    () =>
      files.find((file) => file.uid === selectedFileUid) || files[0] || null,
    [files, selectedFileUid],
  );

  async function load() {
    if (!api) return;
    try {
      const [payload, accountPayload] = await Promise.all([
        api.get<Payload>(`/api/tasks/${task.uid}/connected-files`),
        api.get<AccountPayload>("/api/connect/status"),
      ]);
      setFiles(payload.files);
      setActions(payload.actions);
      setAccounts(accountPayload);
      setSelectedFileUid((current) =>
        current && payload.files.some((file) => file.uid === current)
          ? current
          : payload.files[0]?.uid || "",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    void load();
  }, [task.uid, api]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.source === "karsadesk") void load();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [api, task.uid]);

  async function connect(provider: "google" | "figma") {
    if (!api) return;
    setProviderBusy(true);
    try {
      const payload = await api.post<{
        configured: boolean;
        url: string | null;
        message: string;
      }>(`/api/connect/${provider}/start`);
      if (!payload.configured || !payload.url) {
        toast.error(payload.message);
        return;
      }
      window.open(payload.url, "_blank", "noopener,noreferrer");
      toast.info(`Complete ${provider} login, then return to KarsaDesk.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setProviderBusy(false);
    }
  }

  async function connectPat() {
    if (!api) return;
    setProviderBusy(true);
    try {
      const accountPayload = await api.post<AccountPayload>(
        "/api/connect/figma/pat",
        figmaPat.trim() ? { token: figmaPat.trim() } : {},
      );
      setAccounts(accountPayload);
      setFigmaPat("");
      toast.success("Figma connected locally");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setProviderBusy(false);
    }
  }

  async function disconnect(provider: "google" | "figma") {
    if (!api) return;
    setProviderBusy(true);
    try {
      setAccounts(await api.delete<AccountPayload>(`/api/connect/${provider}`));
      toast.success(`${provider} disconnected`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setProviderBusy(false);
    }
  }

  async function searchGoogleFiles() {
    if (!api) return;
    setProviderBusy(true);
    try {
      const payload = await api.get<{ files: ConnectedProviderFile[] }>(
        `/api/connect/google/files?q=${encodeURIComponent(googleQuery)}`,
      );
      setGoogleFiles(payload.files);
      if (!payload.files.length) toast.info("No Google files found");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setProviderBusy(false);
    }
  }

  async function attachProviderFile(file: ConnectedProviderFile) {
    if (!api) return;
    setBusy(true);
    try {
      const connected = await api.post<ConnectedFile>(
        `/api/tasks/${task.uid}/connected-files/from-provider`,
        {
          provider: file.provider,
          externalFileId: file.externalFileId,
          externalFileUrl: file.externalFileUrl,
          fileType: file.fileType,
          fileName: file.fileName,
        },
      );
      setFiles((items) => [connected, ...items]);
      setSelectedFileUid(connected.uid);
      toast.success("Provider file attached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function attach() {
    if (!api || !url.trim()) return;
    setBusy(true);
    try {
      const file = await api.post<ConnectedFile>(
        `/api/tasks/${task.uid}/connected-files`,
        {
          externalFileUrl: url.trim(),
          fileName: name.trim() || undefined,
        },
      );
      setFiles((items) => [file, ...items]);
      setSelectedFileUid(file.uid);
      setUrl("");
      setName("");
      toast.success("File connected to this task");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function syncFile(file: ConnectedFile) {
    if (!api) return;
    setBusy(true);
    try {
      const updated = await api.post<ConnectedFile>(
        `/api/connected-files/${file.uid}/sync`,
      );
      setFiles((items) =>
        items.map((item) => (item.uid === updated.uid ? updated : item)),
      );
      toast.success("Metadata synced");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function detach(file: ConnectedFile) {
    if (!api) return;
    setBusy(true);
    try {
      await api.delete(`/api/connected-files/${file.uid}`);
      setFiles((items) => items.filter((item) => item.uid !== file.uid));
      toast.success("File detached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function askAi() {
    if (!api || !selectedFile || !prompt.trim()) return;
    setBusy(true);
    try {
      const action = await api.post<AiFileAction>(
        `/api/tasks/${task.uid}/ai-file-actions`,
        {
          connectedFileUid: selectedFile.uid,
          prompt: prompt.trim(),
          actionType: "plan",
          applyMode: "preview",
        },
      );
      setActions((items) => [action, ...items]);
      setPrompt("");
      toast.success(
        action.status === "failed"
          ? "AI action saved with an error"
          : "AI preview prepared",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const google = accounts?.google;
  const figma = accounts?.figma;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-panel p-3">
      <div>
        <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
          <Paperclip className="size-3.5" /> Connected Files
        </h3>
        <p className="mt-1 text-[11px] leading-4 text-muted">
          KarsaDesk connect ke file asli Google/Figma, membaca metadata/context
          via API, lalu menyiapkan preview AI sebelum mengubah file asli.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {[
          { provider: "google" as const, account: google, label: "Google" },
          { provider: "figma" as const, account: figma, label: "Figma" },
        ].map((item) => (
          <div
            key={item.provider}
            className="rounded-lg border border-border bg-background p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <Plug className="size-3.5 text-accent" /> {item.label}
              </span>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[9px]",
                  statusTone(item.account?.status || "not_configured"),
                )}
              >
                {item.account?.status || "not_configured"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">
              {item.account?.accountLabel ||
                item.account?.message ||
                "Checking connector status..."}
            </p>
            <div className="mt-2 flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={providerBusy}
                onClick={() => void connect(item.provider)}
              >
                Connect
              </Button>
              {item.account?.connected && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={providerBusy}
                  onClick={() => void disconnect(item.provider)}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Google Drive picker
          </h4>
          <Button
            size="sm"
            variant="ghost"
            disabled={!google?.connected || providerBusy}
            onClick={() => void searchGoogleFiles()}
          >
            {providerBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Search className="size-3.5" />
            )}
            Search
          </Button>
        </div>
        <input
          className={field}
          value={googleQuery}
          disabled={!google?.connected}
          onChange={(event) => setGoogleQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void searchGoogleFiles();
          }}
          placeholder={
            google?.connected
              ? "Search Google Docs/Sheets/Slides"
              : "Connect Google first"
          }
        />
        {!!googleFiles.length && (
          <div className="mt-2 max-h-40 space-y-1 overflow-auto">
            {googleFiles.map((file) => {
              const Icon = fileIcon(file);
              return (
                <button
                  key={`${file.provider}:${file.externalFileId}`}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-panel p-2 text-left hover:border-accent"
                  onClick={() => void attachProviderFile(file)}
                  disabled={busy}
                >
                  <Icon className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      {file.fileName}
                    </span>
                    <span className="text-[10px] text-muted">
                      {providerLabel(file)} ·{" "}
                      {String(file.metadata.modifiedTime || "no date")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Figma development PAT
        </h4>
        <div className="flex gap-2">
          <input
            className={field}
            type="password"
            value={figmaPat}
            onChange={(event) => setFigmaPat(event.target.value)}
            placeholder="Optional Figma personal access token"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={providerBusy}
            onClick={() => void connectPat()}
          >
            Connect PAT
          </Button>
        </div>
        <p className="mt-1 text-[10px] leading-4 text-muted">
          Token ini dikirim ke orchestrator lokal dan disimpan terenkripsi di
          SQLite lokal, bukan ke browser bundle/NocoDB.
        </p>
      </div>

      <div className="space-y-2">
        <input
          className={field}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste Google Docs/Sheets/Slides or Figma URL"
        />
        <input
          className={field}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Optional display name"
        />
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={!url.trim() || busy}
          onClick={() => void attach()}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Paperclip className="size-3.5" />
          )}
          Attach original file
        </Button>
      </div>

      <div className="space-y-2">
        {!files.length && (
          <div className="rounded-lg border border-dashed border-border p-3 text-[11px] leading-5 text-muted">
            Belum ada file. Connect Google/Figma, pilih file asli, atau paste
            URL langsung. KarsaDesk tidak membuat editor palsu di sini.
          </div>
        )}
        {files.map((file) => {
          const Icon = fileIcon(file);
          const selected = selectedFile?.uid === file.uid;
          return (
            <div
              key={file.uid}
              className={cn(
                "rounded-lg border bg-elevated p-3",
                selected ? "border-accent" : "border-border",
              )}
            >
              <button
                className="flex w-full items-start gap-2 text-left"
                onClick={() => setSelectedFileUid(file.uid)}
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {file.fileName}
                  </span>
                  <span className="mt-1 block text-[10px] text-muted">
                    {providerLabel(file)} · {file.status}
                  </span>
                </span>
              </button>
              <div className="mt-2 flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(file.externalFileUrl, "_blank")}
                >
                  <ExternalLink className="size-3.5" /> Open
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFileUid(file.uid)}
                >
                  <Wand2 className="size-3.5" /> Ask AI
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void syncFile(file)}
                >
                  <RefreshCw className="size-3.5" /> Sync
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void detach(file)}
                  disabled={busy}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          AI Assistant for selected file
        </label>
        <textarea
          className={`${field} min-h-20 resize-y`}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            selectedFile
              ? "Contoh: rapikan jadi bahasa akademik, buat ringkasan, buat tabel, generate slicing plan..."
              : "Attach/select a file first"
          }
        />
        <Button
          size="sm"
          className="mt-2 w-full"
          disabled={!selectedFile || !prompt.trim() || busy}
          onClick={() => void askAi()}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Wand2 className="size-3.5" />
          )}
          Ask AI / prepare preview
        </Button>
      </div>

      {!!actions.length && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            AI action history
          </h4>
          {actions.slice(0, 5).map((action) => (
            <div
              key={action.uid}
              className="rounded-lg border border-border bg-background p-2 text-[11px] leading-4"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[9px]",
                    statusTone(action.status),
                  )}
                >
                  {action.status}
                </span>
                <span className="text-[10px] text-muted">
                  {new Date(action.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-muted">{action.prompt}</p>
              <MarkdownViewer
                dense
                className="scrollbar-thin mt-2 max-h-72 overflow-auto"
              >
                {action.resultSummary}
              </MarkdownViewer>
              {action.errorMessage && (
                <p className="mt-2 text-[10px] text-danger">
                  {action.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
