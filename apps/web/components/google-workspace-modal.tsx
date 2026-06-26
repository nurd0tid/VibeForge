"use client";

import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  Loader2,
  Presentation,
  Search,
  Sheet,
  UploadCloud,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type WorkspaceKind = "docs" | "sheets" | "slides";
type AccountPayload = {
  google: ConnectedAccountPublic;
  figma: ConnectedAccountPublic;
};

const field =
  "w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15";

const kindMeta = {
  docs: {
    label: "Google Docs",
    icon: FileText,
    accept:
      ".docx,.doc,.odt,.rtf,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    helper: "Paper, makalah, laporan, teori",
  },
  sheets: {
    label: "Google Sheets",
    icon: Sheet,
    accept:
      ".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    helper: "Hitungan, tabel, formula",
  },
  slides: {
    label: "Google Slides",
    icon: Presentation,
    accept:
      ".pptx,.ppt,.odp,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    helper: "Presentasi, deck, speaker notes",
  },
} satisfies Record<
  WorkspaceKind,
  {
    label: string;
    icon: typeof FileText;
    accept: string;
    helper: string;
  }
>;

function fileIcon(file: ConnectedProviderFile) {
  if (file.fileType === "sheets") return Sheet;
  if (file.fileType === "slides") return Presentation;
  return FileText;
}

function statusTone(status: string) {
  if (status === "connected") return "border-success/30 text-success";
  if (status === "not_configured" || status === "not_connected")
    return "border-warning/30 text-warning";
  return "border-danger/30 text-danger";
}

async function toBase64(file: File) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 1)
    binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

export function GoogleWorkspaceModal({
  open,
  onOpenChange,
  api,
  selectedTask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: ApiClient | null;
  selectedTask: Task | null;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [accounts, setAccounts] = useState<AccountPayload | null>(null);
  const [files, setFiles] = useState<ConnectedProviderFile[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<WorkspaceKind>("docs");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [draftOnly, setDraftOnly] = useState(false);
  const [draftPreview, setDraftPreview] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<ConnectedProviderFile | null>(null);
  const [filePrompt, setFilePrompt] = useState("");
  const [fileActionResult, setFileActionResult] = useState("");
  const [busy, setBusy] = useState(false);
  const google = accounts?.google;
  const canReadDrive = Boolean(
    google?.scopes.some((scope) => scope.includes("/auth/drive.readonly")),
  );

  async function loadStatus() {
    if (!api) return;
    try {
      setAccounts(await api.get<AccountPayload>("/api/connect/status"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadFiles(nextQuery = query) {
    if (!api) return;
    setBusy(true);
    try {
      const payload = await api.get<{ files: ConnectedProviderFile[] }>(
        `/api/connect/google/files?q=${encodeURIComponent(nextQuery)}&type=${kind}`,
      );
      setFiles(payload.files);
      setSelectedFile((current) => current || payload.files[0] || null);
      if (!payload.files.length) toast.info("No Google files found");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadStatus();
  }, [open, api]);

  useEffect(() => {
    if (open && google?.connected) void loadFiles("");
  }, [open, google?.connected, kind]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.data?.source === "karsadesk" &&
        event.data?.type === "provider-connected" &&
        (!event.data.provider || event.data.provider === "google")
      ) {
        void loadStatus();
        setTimeout(() => void loadFiles(""), 800);
      }
    }
    function onStorage(event: StorageEvent) {
      if (event.key !== "karsadesk-provider-connected" || !event.newValue)
        return;
      const payload = JSON.parse(event.newValue) as {
        provider?: string;
        status?: string;
      };
      if (payload.provider && payload.provider !== "google") return;
      toast[payload.status === "error" ? "error" : "success"](
        payload.status === "error"
          ? "Google connection failed"
          : "Google connected. Refreshing files...",
      );
      void loadStatus();
      setTimeout(() => void loadFiles(""), 800);
    }
    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, [api]);

  async function connectGoogle() {
    if (!api) return;
    setBusy(true);
    try {
      const payload = await api.post<{
        configured: boolean;
        url: string | null;
        message: string;
      }>("/api/connect/google/start");
      if (!payload.configured || !payload.url) {
        toast.error(payload.message);
        return;
      }
      window.open(payload.url, "_blank", "popup,width=980,height=760");
      toast.info("Login Google di tab baru, lalu balik ke KarsaDesk.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function createGoogleFile() {
    if (!api) return;
    if (draftOnly) {
      setDraftPreview(
        [
          `Draft only for ${kindMeta[kind].label}`,
          `Title: ${title || "Untitled"}`,
          "",
          prompt ||
            "Tulis prompt dulu. Draft ini belum disimpan ke Google Docs/Sheets/Slides.",
        ].join("\n"),
      );
      toast.success("Draft preview prepared without saving to Google");
      return;
    }
    if (!google?.connected) {
      toast.error("Login Google dulu sebelum membuat file di Google Workspace");
      return;
    }
    setBusy(true);
    try {
      const file = await api.post<ConnectedProviderFile>(
        "/api/connect/google/files",
        {
          fileType: kind,
          title: title || "Untitled KarsaDesk document",
          prompt,
        },
      );
      setFiles((items) => [file, ...items]);
      setSelectedFile(file);
      setDraftPreview("");
      toast.success(`${file.fileName} created in ${kindMeta[kind].label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function importToGoogle(file: File) {
    if (!api) return;
    if (!google?.connected) {
      toast.error("Login Google dulu sebelum import file ke Google Drive");
      return;
    }
    setBusy(true);
    try {
      const imported = await api.post<ConnectedProviderFile>(
        "/api/connect/google/import",
        {
          fileType: kind,
          name: file.name,
          base64: await toBase64(file),
          mimeType: file.type || undefined,
        },
      );
      setFiles((items) => [imported, ...items]);
      setSelectedFile(imported);
      toast.success(`${file.name} imported to ${kindMeta[kind].label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function attachAndAskSelectedFile() {
    if (!api || !selectedFile) return;
    if (!selectedTask) {
      toast.error("Pilih task dulu di board, baru attach file ke task itu.");
      return;
    }
    setBusy(true);
    try {
      const connected = await api.post<ConnectedFile>(
        `/api/tasks/${selectedTask.uid}/connected-files/from-provider`,
        {
          provider: selectedFile.provider,
          externalFileId: selectedFile.externalFileId,
          externalFileUrl: selectedFile.externalFileUrl,
          fileType: selectedFile.fileType,
          fileName: selectedFile.fileName,
        },
      );
      if (filePrompt.trim()) {
        const action = await api.post<AiFileAction>(
          `/api/tasks/${selectedTask.uid}/ai-file-actions`,
          {
            connectedFileUid: connected.uid,
            prompt: filePrompt.trim(),
            actionType: "plan",
            applyMode: "preview",
          },
        );
        setFileActionResult(action.resultSummary || action.errorMessage || "");
      }
      toast.success(`Attached to KD-${selectedTask.number}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const ActiveIcon = kindMeta[kind].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-24px)] w-[min(1120px,calc(100vw-24px))] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ActiveIcon className="size-5 text-accent" /> Google Workspace
          </DialogTitle>
          <DialogDescription>
            Login Google, lihat file Docs/Sheets/Slides asli, buat file dari
            prompt langsung ke Google, atau import file lokal ke Google Drive.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[min(620px,calc(100vh-180px))] gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4 rounded-2xl border border-border bg-panel p-4">
            <div className="rounded-xl border border-border bg-elevated p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Google account</p>
                  <p className="mt-1 text-xs text-muted">
                    {google?.accountLabel ||
                      google?.message ||
                      "Connect untuk membaca Google Drive kamu."}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-[10px]",
                    statusTone(google?.status || "not_configured"),
                  )}
                >
                  {google?.status || "checking"}
                </span>
              </div>
              <Button
                className="mt-3 w-full"
                variant={google?.connected ? "secondary" : "default"}
                disabled={busy}
                onClick={() => void connectGoogle()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
                {google?.connected ? "Reconnect Google" : "Login Google"}
              </Button>
              {google?.connected && !canReadDrive && (
                <p className="mt-2 rounded-lg border border-warning/30 bg-warning/10 p-2 text-[11px] leading-5 text-warning">
                  Reconnect dibutuhkan supaya file Docs/Sheets/Slides lama di
                  Drive kamu ikut muncul. Token lama hanya bisa lihat file yang
                  dibuat/dipilih app.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-xl bg-elevated p-1">
              {(Object.keys(kindMeta) as WorkspaceKind[]).map((item) => {
                const Icon = kindMeta[item].icon;
                return (
                  <button
                    key={item}
                    onClick={() => setKind(item)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] text-muted transition hover:bg-panel-strong",
                      kind === item && "bg-accent/10 text-accent",
                    )}
                  >
                    <Icon className="size-4" />
                    {kindMeta[item].label.replace("Google ", "")}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Title
              </label>
              <input
                className={field}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Judul tugas / presentasi / sheet"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Prompt awal
              </label>
              <textarea
                className={`${field} min-h-32 resize-y text-xs`}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Contoh: buat draft paper e-business 5 halaman dengan bahasa akademik..."
              />
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-border bg-elevated p-3 text-xs text-muted">
              <input
                type="checkbox"
                checked={draftOnly}
                onChange={(event) => setDraftOnly(event.target.checked)}
              />
              Jangan simpan dulu ke Google, preview prompt saja
            </label>

            <Button
              className="w-full"
              disabled={busy}
              onClick={() => void createGoogleFile()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              {draftOnly ? "Prepare draft preview" : "Create in Google"}
            </Button>

            <input
              ref={fileInput}
              className="hidden"
              type="file"
              accept={kindMeta[kind].accept}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importToGoogle(file);
                event.currentTarget.value = "";
              }}
            />
            <Button
              className="w-full"
              variant="secondary"
              disabled={busy || !google?.connected}
              onClick={() => fileInput.current?.click()}
            >
              <UploadCloud className="size-4" />
              Import file to Google
            </Button>
            <p className="text-[11px] leading-5 text-muted">
              Upload lokal bukan diedit di KarsaDesk; file dikirim ke Google
              Drive dan dikonversi menjadi {kindMeta[kind].label}.
            </p>
          </aside>

          <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  className={`${field} pl-9`}
                  value={query}
                  disabled={!google?.connected}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void loadFiles();
                  }}
                  placeholder={
                    google?.connected
                      ? "Search Google Docs, Sheets, Slides"
                      : "Login Google dulu untuk melihat file"
                  }
                />
              </div>
              <Button
                variant="secondary"
                disabled={!google?.connected || busy}
                onClick={() => void loadFiles()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Search
              </Button>
            </div>

            {draftPreview && (
              <pre className="mb-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-xs text-muted">
                {draftPreview}
              </pre>
            )}

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="scrollbar-thin min-h-0 space-y-2 overflow-auto">
                {!google?.connected && (
                  <div className="grid h-full place-items-center rounded-xl border border-dashed border-border p-8 text-center">
                    <div>
                      <ActiveIcon className="mx-auto mb-3 size-10 text-accent" />
                      <h3 className="text-lg font-semibold">
                        Login Google dulu
                      </h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                        Setelah login, KarsaDesk bisa menampilkan Google Docs,
                        Sheets, dan Slides asli milik kamu, lalu bantu lewat AI.
                      </p>
                    </div>
                  </div>
                )}
                {google?.connected && !files.length && (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                    Belum ada file tampil. Search Drive atau buat file baru dari
                    prompt.
                  </div>
                )}
                {files.map((file) => {
                  const Icon = fileIcon(file);
                  const selected =
                    selectedFile?.externalFileId === file.externalFileId;
                  return (
                    <article
                      key={`${file.provider}:${file.externalFileId}`}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border bg-elevated p-3",
                        selected ? "border-accent" : "border-border",
                      )}
                    >
                      <Icon className="size-5 shrink-0 text-accent" />
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setSelectedFile(file)}
                      >
                        <h3 className="truncate text-sm font-medium">
                          {file.fileName}
                        </h3>
                        <p className="mt-1 text-[11px] text-muted">
                          {kindMeta[file.fileType as WorkspaceKind]?.label ||
                            "Google file"}{" "}
                          · {String(file.metadata.modifiedTime || "no date")}
                        </p>
                      </button>
                      <Button
                        size="sm"
                        variant={selected ? "default" : "secondary"}
                        onClick={() => setSelectedFile(file)}
                      >
                        Select
                      </Button>
                    </article>
                  );
                })}
              </div>
              <aside className="min-h-0 rounded-xl border border-border bg-elevated p-3">
                <p className="text-xs font-semibold">Selected file</p>
                {selectedFile ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-border bg-panel p-3">
                      <p className="truncate text-sm font-medium">
                        {selectedFile.fileName}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        Target task:{" "}
                        {selectedTask
                          ? `KD-${selectedTask.number} · ${selectedTask.title}`
                          : "pilih task dulu di board"}
                      </p>
                    </div>
                    <textarea
                      className={`${field} min-h-28 text-xs`}
                      value={filePrompt}
                      onChange={(event) => setFilePrompt(event.target.value)}
                      placeholder="Prompt untuk file ini. Contoh: ringkas dokumen, buat outline revisi, cek tabel, susun slide..."
                    />
                    <Button
                      className="w-full"
                      disabled={busy || !selectedTask}
                      onClick={() => void attachAndAskSelectedFile()}
                    >
                      <Wand2 className="size-4" />
                      Attach & ask AI
                    </Button>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() =>
                        window.open(selectedFile.externalFileUrl, "_blank")
                      }
                    >
                      <ExternalLink className="size-4" /> Open original
                    </Button>
                    {fileActionResult && (
                      <pre className="scrollbar-thin max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-[11px] text-muted">
                        {fileActionResult}
                      </pre>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-muted">
                    Pilih file dari daftar Drive. Setelah itu KarsaDesk bisa
                    attach file ke task yang sedang dipilih dan membuat preview
                    rencana perubahan.
                  </p>
                )}
              </aside>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
