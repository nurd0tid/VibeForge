"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  Presentation,
  RefreshCw,
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
  Project,
  Provider,
  Task,
} from "@vk/contracts";
import type { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { WorkspaceAiPanel } from "@/components/workspace-ai-panel";
import { cn } from "@/lib/utils";
import { confirmAction, showActionError } from "@/lib/sweet-alert";

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

function googlePreviewUrl(file: ConnectedProviderFile) {
  const id = encodeURIComponent(file.externalFileId);
  if (file.fileType === "sheets")
    return `https://docs.google.com/spreadsheets/d/${id}/preview`;
  if (file.fileType === "slides")
    return `https://docs.google.com/presentation/d/${id}/preview`;
  return `https://docs.google.com/document/d/${id}/preview`;
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
  project,
  providers,
  initialProviderId,
  initialModelId,
  onTaskCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: ApiClient | null;
  project: Project | null;
  providers: Provider[];
  initialProviderId: string;
  initialModelId: string;
  onTaskCreated: (task: Task) => void;
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
  const [lastAction, setLastAction] = useState<AiFileAction | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewMode, setPreviewMode] = useState<"api" | "visual">("api");
  const [contextText, setContextText] = useState("");
  const [contextBusy, setContextBusy] = useState(false);
  const [contextError, setContextError] = useState("");
  const [actionStage, setActionStage] = useState<
    "idle" | "reading" | "thinking" | "ready" | "failed"
  >("idle");
  const [busy, setBusy] = useState(false);
  const [providerId, setProviderId] = useState(initialProviderId);
  const [modelId, setModelId] = useState(initialModelId);
  const google = accounts?.google;
  const selectedProvider =
    providers.find((provider) => provider.id === providerId) ||
    providers[0] ||
    null;
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
      setSelectedFile(
        (current) =>
          payload.files.find(
            (file) => file.externalFileId === current?.externalFileId,
          ) ||
          payload.files[0] ||
          null,
      );
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
    setPreviewRevision((value) => value + 1);
    setFileActionResult("");
    setLastAction(null);
    setActionStage("idle");
    setPreviewMode("api");
    setContextText("");
    setContextError("");
    if (!api || !selectedFile || selectedFile.fileType === "figma") return;
    setContextBusy(true);
    void api
      .get<{ text: string }>(
        `/api/connect/google/files/${encodeURIComponent(selectedFile.externalFileId)}/context?fileType=${selectedFile.fileType}`,
      )
      .then((result) => setContextText(result.text))
      .catch((error) =>
        setContextError(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setContextBusy(false));
  }, [selectedFile?.externalFileId]);

  useEffect(() => {
    if (selectedProvider && !providerId) setProviderId(selectedProvider.id);
    if (
      selectedProvider &&
      !selectedProvider.models.some((model) => model.id === modelId)
    )
      setModelId(selectedProvider.models[0]?.id || "");
  }, [modelId, providerId, selectedProvider]);

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

  async function createTrackedTask(userPrompt: string, aiAnswer?: string) {
    if (!api || !project || !selectedFile || !userPrompt.trim()) return null;
    const task = await api.post<Task>(`/api/projects/${project.uid}/tasks`, {
      title: `${kindMeta[kind].label}: ${selectedFile.fileName}`,
      roughPrompt: userPrompt.trim(),
      refinedPrompt: [
        `# ${kindMeta[kind].label} workspace task`,
        "",
        `File: ${selectedFile.fileName}`,
        "",
        "User request:",
        userPrompt.trim(),
        ...(aiAnswer ? ["", "AI conversation result:", aiAnswer.trim()] : []),
      ].join("\n"),
      mode: "build",
      priority: "medium",
      acceptanceCriteria: [
        "AI revision is reviewed before it is applied to Google.",
        "Existing file content is preserved by the non-destructive apply mode.",
      ],
      verification: ["Refresh the embedded Google preview after apply."],
      dependencyUids: [],
      source: "manual",
    });
    await api.post<ConnectedFile>(
      `/api/tasks/${task.uid}/connected-files/from-provider`,
      {
        provider: selectedFile.provider,
        externalFileId: selectedFile.externalFileId,
        externalFileUrl: selectedFile.externalFileUrl,
        fileType: selectedFile.fileType,
        fileName: selectedFile.fileName,
      },
    );
    onTaskCreated(task);
    return task;
  }

  async function createTaskFromConversation(prompt: string, answer: string) {
    try {
      const task = await createTrackedTask(prompt, answer);
      if (task)
        toast.success(`Google workspace task KD-${task.number} created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  async function attachAndAskSelectedFile() {
    if (!api || !selectedFile) return;
    if (!filePrompt.trim()) {
      toast.error("Tulis instruksi untuk file ini terlebih dahulu.");
      return;
    }
    setBusy(true);
    setActionStage("reading");
    setFileActionResult("");
    try {
      const targetTask = await createTrackedTask(filePrompt.trim());
      if (!targetTask)
        throw new Error(
          "Pilih project atau task terlebih dahulu agar pekerjaan bisa dilacak.",
        );
      const connectedFiles = await api.get<{ files: ConnectedFile[] }>(
        `/api/tasks/${targetTask.uid}/connected-files`,
      );
      const connected = connectedFiles.files.find(
        (file) => file.externalFileId === selectedFile.externalFileId,
      );
      if (!connected) throw new Error("Google file attachment was not created");
      if (filePrompt.trim()) {
        setActionStage("thinking");
        const action = await api.post<AiFileAction>(
          `/api/tasks/${targetTask.uid}/ai-file-actions`,
          {
            connectedFileUid: connected.uid,
            prompt: filePrompt.trim(),
            actionType: "plan",
            applyMode: "preview",
            providerId: selectedProvider?.id,
            modelId: modelId || undefined,
          },
        );
        setLastAction(action);
        setFileActionResult(action.resultSummary || action.errorMessage || "");
        setActionStage(action.status === "failed" ? "failed" : "ready");
      } else {
        setFileActionResult(
          "File berhasil di-attach. Tulis instruksi agar AI menyiapkan revisi yang bisa direview.",
        );
      }
      if (!filePrompt.trim()) setActionStage("ready");
      setPreviewRevision((value) => value + 1);
      toast.success(`AI revision prepared in KD-${targetTask.number}`);
    } catch (error) {
      setActionStage("failed");
      const detail = error instanceof Error ? error.message : String(error);
      toast.error("Google revision preview could not be prepared");
      const setupUrl = detail.match(/Setup URL:\s*(https:\/\/\S+)/i)?.[1];
      await showActionError({
        title: /disabled|propagating|has not been used/i.test(detail)
          ? "Google API is not ready"
          : "Google revision preparation failed",
        text: detail,
        actionText: "Open Google API setup",
        actionUrl: setupUrl,
      });
    } finally {
      setBusy(false);
    }
  }

  async function applyGoogleRevision() {
    if (!api || !lastAction || !selectedFile) return;
    const behavior =
      selectedFile.fileType === "docs"
        ? "append the approved revision to the document"
        : selectedFile.fileType === "sheets"
          ? "append the approved rows to the first sheet"
          : "add a new slide containing the approved revision";
    const confirmed = await confirmAction({
      title: "Apply approved Google revision?",
      text: `KarsaDesk will ${behavior}. Existing content will not be removed.`,
      confirmText: "Apply revision",
      cancelText: "Keep preview only",
    });
    if (!confirmed) {
      toast.info("Google revision kept as preview only");
      return;
    }
    setBusy(true);
    setActionStage("thinking");
    try {
      const result = await api.post<{ action: AiFileAction }>(
        `/api/ai-file-actions/${lastAction.uid}/apply`,
        { confirmed: true },
      );
      setLastAction(result.action);
      setFileActionResult(result.action.resultSummary);
      setActionStage("ready");
      setPreviewRevision((value) => value + 1);
      window.setTimeout(() => setPreviewRevision((value) => value + 1), 1200);
      toast.success("Approved AI revision applied to Google");
    } catch (error) {
      setActionStage("failed");
      const detail = error instanceof Error ? error.message : String(error);
      toast.error("Google revision could not be applied");
      const setupUrl = detail.match(/Setup URL:\s*(https:\/\/\S+)/i)?.[1];
      await showActionError({
        title: /disabled|propagating|has not been used/i.test(detail)
          ? "Google API is not ready"
          : "Google apply failed",
        text: detail,
        actionText: "Open Google API setup",
        actionUrl: setupUrl,
      });
    } finally {
      setBusy(false);
    }
  }

  const ActiveIcon = kindMeta[kind].icon;

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b border-border bg-panel px-3 py-2 sm:px-5">
        <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
          <ArrowLeft className="size-4" /> Back to kanban
        </Button>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-sm font-semibold">
            <ActiveIcon className="size-4 text-accent" /> Google Workspace
          </h1>
          <p className="hidden text-[11px] text-muted sm:block">
            Pilih file, lihat preview, lalu prompt AI tanpa keluar dari halaman.
          </p>
        </div>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          <select
            className="h-9 max-w-44 rounded-lg border border-border bg-elevated px-2 text-xs outline-none"
            value={selectedProvider?.id || ""}
            onChange={(event) => setProviderId(event.target.value)}
            title="AI provider"
          >
            {!providers.length && <option value="">No AI provider</option>}
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 max-w-52 rounded-lg border border-border bg-elevated px-2 text-xs outline-none"
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            disabled={!selectedProvider}
            title="AI model"
          >
            {!selectedProvider && <option value="">No model</option>}
            {selectedProvider?.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!google?.connected || busy}
            onClick={() => void loadFiles(query)}
          >
            <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
            Refresh files
          </Button>
        </div>
      </header>

      <main className="scrollbar-thin min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        <div className="grid min-h-full gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
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
              <MarkdownViewer
                dense
                className="scrollbar-thin mb-3 max-h-44 overflow-auto"
              >
                {draftPreview}
              </MarkdownViewer>
            )}

            <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[260px_minmax(480px,1fr)_420px]">
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
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedFile(file)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ")
                          setSelectedFile(file);
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border bg-elevated p-3 transition hover:border-accent/60",
                        selected ? "border-accent" : "border-border",
                      )}
                    >
                      <Icon className="size-5 shrink-0 text-accent" />
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedFile(file);
                        }}
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
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedFile(file);
                        }}
                      >
                        Select
                      </Button>
                    </article>
                  );
                })}
              </div>
              <section className="min-h-[420px] overflow-hidden rounded-xl border border-border bg-background">
                <div className="flex min-h-11 items-center justify-between gap-2 border-b border-border bg-elevated px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">
                      {selectedFile?.fileName || "Google file preview"}
                    </p>
                    <p className="text-[10px] text-muted">
                      Live preview dari file yang sedang dipilih
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex rounded-lg border border-border bg-panel p-0.5 text-[10px]">
                      <button
                        className={cn(
                          "rounded px-2 py-1",
                          previewMode === "api"
                            ? "bg-accent text-accent-foreground"
                            : "text-muted",
                        )}
                        onClick={() => setPreviewMode("api")}
                      >
                        API text
                      </button>
                      <button
                        className={cn(
                          "rounded px-2 py-1",
                          previewMode === "visual"
                            ? "bg-accent text-accent-foreground"
                            : "text-muted",
                        )}
                        onClick={() => setPreviewMode("visual")}
                      >
                        Google visual
                      </button>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!selectedFile}
                      onClick={() => {
                        if (previewMode === "visual")
                          setPreviewRevision((value) => value + 1);
                        else if (selectedFile) {
                          setContextBusy(true);
                          setContextError("");
                          void api
                            ?.get<{ text: string }>(
                              `/api/connect/google/files/${encodeURIComponent(selectedFile.externalFileId)}/context?fileType=${selectedFile.fileType}`,
                            )
                            .then((result) => setContextText(result.text))
                            .catch((error) =>
                              setContextError(
                                error instanceof Error
                                  ? error.message
                                  : String(error),
                              ),
                            )
                            .finally(() => setContextBusy(false));
                        }
                      }}
                    >
                      <RefreshCw
                        className={cn(
                          "size-3.5",
                          contextBusy && "animate-spin",
                        )}
                      />{" "}
                      Refresh
                    </Button>
                  </div>
                </div>
                {selectedFile ? (
                  previewMode === "visual" ? (
                    <iframe
                      key={`${selectedFile.externalFileId}:${previewRevision}`}
                      title={`${selectedFile.fileName} preview`}
                      src={googlePreviewUrl(selectedFile)}
                      className="h-[min(720px,72vh)] min-h-[520px] w-full bg-white"
                      allow="clipboard-read; clipboard-write; fullscreen"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <div className="scrollbar-thin h-[min(720px,72vh)] min-h-[520px] overflow-auto p-5">
                      {contextBusy ? (
                        <div className="grid h-full place-items-center text-sm text-muted">
                          <Loader2 className="size-6 animate-spin" />
                        </div>
                      ) : contextError ? (
                        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                          API preview failed: {contextError}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground">
                          {contextText || "No readable text was returned."}
                        </pre>
                      )}
                    </div>
                  )
                ) : (
                  <div className="grid min-h-[420px] place-items-center p-8 text-center text-sm text-muted">
                    Pilih file di sebelah kiri untuk membuka preview Docs,
                    Sheets, atau Slides langsung di KarsaDesk.
                  </div>
                )}
              </section>
              <div className="min-w-0 space-y-3">
                <WorkspaceAiPanel
                  api={api}
                  project={project}
                  workspace="google"
                  file={
                    selectedFile && selectedFile.fileType !== "figma"
                      ? {
                          externalFileId: selectedFile.externalFileId,
                          externalFileUrl: selectedFile.externalFileUrl,
                          fileType: selectedFile.fileType,
                          fileName: selectedFile.fileName,
                        }
                      : null
                  }
                  providerId={selectedProvider?.id || ""}
                  modelId={modelId}
                  onCreateTask={createTaskFromConversation}
                />
                {selectedFile && (
                  <>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() =>
                        window.open(selectedFile.externalFileUrl, "_blank")
                      }
                    >
                      <ExternalLink className="size-4" /> Open original
                    </Button>
                    <details className="overflow-hidden rounded-xl border border-border bg-elevated">
                      <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold">
                        Prepare an actual Google change
                      </summary>
                      <div className="space-y-3 border-t border-border p-3">
                        <p className="text-[10px] leading-4 text-muted">
                          Ini berbeda dari Ask AI: tombol di bawah akan membuat
                          task Google secara eksplisit dan menyiapkan revisi
                          untuk approval.
                        </p>
                        <textarea
                          className={`${field} min-h-28 text-xs`}
                          value={filePrompt}
                          onChange={(event) =>
                            setFilePrompt(event.target.value)
                          }
                          placeholder="Contoh: tambahkan ringkasan dua paragraf di akhir dokumen..."
                        />
                        <div
                          className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-panel p-1 text-center text-[9px] uppercase tracking-wide"
                          aria-live="polite"
                        >
                          {[
                            ["reading", "Read file"],
                            ["thinking", "AI draft"],
                            ["ready", "Review"],
                          ].map(([stage, label]) => {
                            const order = [
                              "idle",
                              "reading",
                              "thinking",
                              "ready",
                            ];
                            const active =
                              actionStage !== "failed" &&
                              order.indexOf(actionStage) >=
                                order.indexOf(stage);
                            return (
                              <span
                                key={stage}
                                className={cn(
                                  "rounded px-1 py-1.5 text-muted",
                                  active && "bg-accent/10 text-accent",
                                  actionStage === "failed" &&
                                    stage === "reading" &&
                                    "bg-danger/10 text-danger",
                                )}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                        <Button
                          className="w-full"
                          disabled={
                            busy ||
                            !filePrompt.trim() ||
                            !selectedProvider ||
                            !modelId
                          }
                          onClick={() => void attachAndAskSelectedFile()}
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Wand2 className="size-4" />
                          )}
                          {actionStage === "reading"
                            ? "Reading file..."
                            : actionStage === "thinking"
                              ? "AI preparing revision..."
                              : "Create change task & preview"}
                        </Button>
                        {fileActionResult && (
                          <MarkdownViewer
                            dense
                            className="scrollbar-thin max-h-72 overflow-auto"
                          >
                            {fileActionResult}
                          </MarkdownViewer>
                        )}
                        {lastAction?.status === "needs_confirmation" && (
                          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                            <p className="text-[11px] leading-5 text-warning">
                              Docs append content, Sheets append rows, dan
                              Slides membuat slide baru. Tidak ada isi lama yang
                              dihapus.
                            </p>
                            <Button
                              className="mt-2 w-full"
                              disabled={busy}
                              onClick={() => void applyGoogleRevision()}
                            >
                              <Wand2 className="size-4" /> Apply approved
                              revision
                            </Button>
                          </div>
                        )}
                      </div>
                    </details>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
