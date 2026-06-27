"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function MarkdownViewer({
  children,
  className,
  dense = false,
}: {
  children: string;
  className?: string;
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words rounded-xl border border-border bg-background/70 text-foreground dark:prose-invert",
        "prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-lg prose-h2:text-sm prose-h3:text-xs",
        "prose-p:leading-6 prose-li:my-0 prose-ul:my-2 prose-ol:my-2 prose-a:break-all prose-pre:max-w-full prose-pre:overflow-x-auto prose-code:rounded prose-code:bg-panel-strong prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none",
        dense ? "p-3 text-[12px]" : "p-4 text-[13px]",
        className,
      )}
    >
      <ReactMarkdown>{children || "_No markdown content._"}</ReactMarkdown>
    </div>
  );
}
