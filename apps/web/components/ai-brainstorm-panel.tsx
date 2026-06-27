"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Copy,
  Loader2,
  MessageSquare,
  PanelRightClose,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { Project, Provider } from "@vk/contracts";
import type { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarkdownViewer } from "@/components/markdown-viewer";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  fallback?: boolean;
  status?: "pending" | "error";
};

const field =
  "w-full rounded-lg border border-border bg-panel px-3 py-2 text-xs outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15";

export function AiBrainstormPanel({
  api,
  project,
  providers,
  onClose,
  onUseAsSmartPrompt,
}: {
  api: ApiClient | null;
  project: Project;
  providers: Provider[];
  onClose: () => void;
  onUseAsSmartPrompt: (prompt: string) => void;
}) {
  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Halo, aku AI brainstorming KarsaDesk. Pakai aku buat ngetes ide, merapikan prompt, atau memecah kerja sebelum masuk Smart Prompt.",
    },
  ]);
  const provider = useMemo(
    () => providers.find((item) => item.id === providerId) || null,
    [providers, providerId],
  );

  useEffect(() => {
    if (provider && !provider.models.some((item) => item.id === modelId))
      setModelId(provider.models[0]?.id || "");
    if (!provider) setModelId("");
  }, [provider, modelId]);

  async function send() {
    if (!api || !input.trim()) return;
    const message = input.trim();
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: message },
      {
        role: "assistant",
        content: provider
          ? `Running ${provider.name} · ${modelId || "selected model"}...`
          : "Running local fallback...",
        status: "pending",
      },
    ];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    try {
      const response = await api.post<{ message: string; fallback: boolean }>(
        `/api/projects/${project.uid}/ai-chat`,
        {
          message,
          providerId: provider?.id,
          modelId,
          history: nextMessages
            .filter((item) => item.status !== "pending")
            .map(({ role, content }) => ({ role, content })),
        },
      );
      setMessages((items) => [
        ...items.filter((item) => item.status !== "pending"),
        {
          role: "assistant",
          content:
            response.message ||
            "OpenCode returned an empty response. Check provider billing/credential status, then try again.",
          fallback: response.fallback,
          status: response.message ? undefined : "error",
        },
      ]);
      if (response.fallback) toast.info("AI chat used a local fallback");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMessages((items) => [
        ...items.filter((item) => item.status !== "pending"),
        {
          role: "assistant",
          content: message,
          status: "error",
          fallback: true,
        },
      ]);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  }

  const lastAssistant = [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        message.status !== "pending" &&
        message.status !== "error",
    );

  return (
    <aside className="scrollbar-thin fixed inset-y-0 right-0 z-30 flex w-[min(92vw,380px)] shrink-0 flex-col overflow-y-auto border-l border-border bg-elevated shadow-2xl lg:static lg:z-auto lg:w-[360px] lg:shadow-none">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-accent" />
          <span className="text-sm font-semibold">AI chat</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-muted hover:bg-panel-strong"
          aria-label="Close AI chat"
        >
          <PanelRightClose className="size-4" />
        </button>
      </div>

      <div className="space-y-3 border-b border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            className={field}
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
          >
            <option value="">Local fallback / instant</option>
            {providers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            disabled={!provider}
          >
            {!provider && <option value="">No model</option>}
            {provider?.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        {!providers.length && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-[11px] leading-4 text-warning">
            No OpenCode provider detected. Chat still works with local fallback
            so you can test ideas.
          </p>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((message, index) => (
          <article
            key={index}
            className={`rounded-xl border p-3 text-xs leading-5 ${
              message.role === "user"
                ? "border-accent/30 bg-accent/10"
                : message.status === "error"
                  ? "border-danger/30 bg-danger/10"
                  : message.status === "pending"
                    ? "border-warning/30 bg-warning/10"
                    : "border-border bg-panel"
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                {message.status === "pending" ? (
                  <Loader2 className="size-3.5 animate-spin text-warning" />
                ) : message.role === "assistant" ? (
                  <Bot className="size-3.5 text-accent" />
                ) : (
                  <MessageSquare className="size-3.5 text-accent" />
                )}
                {message.role === "assistant" ? "KarsaDesk AI" : "You"}
                {message.fallback && (
                  <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[9px] text-warning">
                    fallback
                  </span>
                )}
                {message.status === "error" && (
                  <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[9px] text-danger">
                    provider error
                  </span>
                )}
              </span>
              {message.status !== "pending" && (
                <button
                  className="text-muted hover:text-foreground"
                  onClick={() => void copy(message.content)}
                  aria-label="Copy message"
                >
                  <Copy className="size-3.5" />
                </button>
              )}
            </div>
            {message.role === "assistant" ? (
              <MarkdownViewer
                dense
                className="border-0 bg-transparent p-0 text-muted"
              >
                {message.content}
              </MarkdownViewer>
            ) : (
              <p className="whitespace-pre-wrap text-muted">
                {message.content}
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="space-y-2 border-t border-border p-3">
        <textarea
          className={`${field} min-h-24 resize-y`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey))
              void send();
          }}
          placeholder="Brainstorm, test prompt, minta pecah task... Ctrl+Enter untuk kirim"
        />
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={!input.trim() || busy}
            onClick={() => void send()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquare className="size-4" />
            )}
            Send
          </Button>
          <Button
            variant="secondary"
            disabled={!lastAssistant}
            onClick={() => {
              if (lastAssistant) onUseAsSmartPrompt(lastAssistant.content);
            }}
          >
            <Sparkles className="size-4" />
            Smart
          </Button>
        </div>
      </div>
    </aside>
  );
}
