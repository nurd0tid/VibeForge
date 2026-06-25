"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Palette,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { ConnectedAccountPublic, Project } from "@vk/contracts";
import type { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AccountPayload = {
  google: ConnectedAccountPublic;
  figma: ConnectedAccountPublic;
};

const field =
  "w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60";

function figmaFileKey(value: string) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((part) =>
      ["file", "design", "proto", "board"].includes(part),
    );
    return index >= 0 ? parts[index + 1] || "" : "";
  } catch {
    return "";
  }
}

export function FigmaLiveModal({
  open,
  onOpenChange,
  api,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: ApiClient | null;
  project: Project | null;
}) {
  const [accounts, setAccounts] = useState<AccountPayload | null>(null);
  const [pat, setPat] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fileKey = useMemo(() => figmaFileKey(fileUrl), [fileUrl]);
  const figma = accounts?.figma;

  async function loadStatus() {
    if (!api) return;
    try {
      setAccounts(await api.get<AccountPayload>("/api/connect/status"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    if (open) void loadStatus();
  }, [open, api]);

  async function connectOAuth() {
    if (!api) return;
    setBusy(true);
    try {
      const payload = await api.post<{
        configured: boolean;
        url: string | null;
        message: string;
      }>("/api/connect/figma/start");
      if (!payload.configured || !payload.url) {
        toast.error(payload.message);
        return;
      }
      window.open(payload.url, "_blank", "noopener,noreferrer");
      toast.info("Complete Figma login, then return to KarsaDesk.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function connectPat() {
    if (!api) return;
    setBusy(true);
    try {
      setAccounts(
        await api.post<AccountPayload>(
          "/api/connect/figma/pat",
          pat.trim() ? { token: pat.trim() } : {},
        ),
      );
      setPat("");
      toast.success("Figma connected locally");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!fileKey) return;
    await navigator.clipboard.writeText(fileKey);
    toast.success("Figma file key copied");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(860px,calc(100vw-24px))]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-5 text-accent" /> Figma Live
          </DialogTitle>
          <DialogDescription>
            Figma is live: connect OAuth or PAT locally, open the real Figma
            file, then attach it to a task from Connected Files for AI context
            and review history.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <section className="space-y-4 rounded-2xl border border-border bg-elevated p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Project context
                </label>
                <input
                  className={field}
                  disabled
                  value={project?.name || "No project selected"}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Figma auth status
                </label>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-panel px-3 text-sm">
                  {figma?.connected ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <ShieldCheck className="size-4 text-warning" />
                  )}
                  <span className="capitalize">
                    {figma?.status?.replaceAll("_", " ") || "checking"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Figma OAuth
                </label>
                <p className="text-xs leading-5 text-muted">
                  Requires `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`, and
                  redirect URI in `.env.local`.
                </p>
              </div>
              <Button
                disabled={busy || !api}
                onClick={() => void connectOAuth()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PlugZap className="size-4" />
                )}
                Connect OAuth
              </Button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Development PAT
              </label>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  className={field}
                  type="password"
                  value={pat}
                  onChange={(event) => setPat(event.target.value)}
                  placeholder="Paste Figma personal access token, or leave empty to use FIGMA_PERSONAL_ACCESS_TOKEN"
                />
                <Button
                  variant="secondary"
                  disabled={busy || !api}
                  onClick={() => void connectPat()}
                >
                  Connect PAT
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Token is sent only to the local orchestrator and stored in local
                SQLite. It is not exposed to the browser bundle or NocoDB.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Figma file URL
              </label>
              <input
                className={field}
                value={fileUrl}
                onChange={(event) => setFileUrl(event.target.value)}
                placeholder="https://www.figma.com/design/<fileKey>/..."
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded bg-panel-strong px-2 py-1 font-mono">
                  {fileKey ? `file key: ${fileKey}` : "Paste a Figma URL"}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!fileKey}
                  onClick={() => void copyKey()}
                >
                  <Copy className="size-3.5" /> Copy key
                </Button>
                <Button
                  size="sm"
                  disabled={!fileUrl}
                  onClick={() =>
                    window.open(fileUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  <ExternalLink className="size-3.5" /> Open Figma
                </Button>
              </div>
            </div>
          </section>

          <aside className="space-y-3 rounded-2xl border border-border bg-panel p-4 text-sm leading-6 text-muted">
            <p className="font-medium text-foreground">Live workflow</p>
            <ol className="list-decimal space-y-1 pl-4 text-xs">
              <li>Connect OAuth or PAT here.</li>
              <li>Open or copy the Figma file URL/key.</li>
              <li>Select a kanban task.</li>
              <li>Use Connected Files to attach the Figma URL.</li>
              <li>
                AI can read metadata/tree context and prepare reviewable
                actions.
              </li>
            </ol>
            <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success">
              Figma is active in KarsaDesk. Secrets stay local, and destructive
              edits still go through task review/confirmation.
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => void loadStatus()}
              disabled={!api || busy}
            >
              Refresh status
            </Button>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
