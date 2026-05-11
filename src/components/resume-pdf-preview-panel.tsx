"use client";

import { useCallback, useMemo, useState } from "react";

type ResumePdfPreviewPanelProps = {
  initialUrl?: string;
};

function normalizeIncomingUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function looksLikePdfUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("/api/resume-pdf")) return true;
  if (lower.includes(".pdf")) return true;
  if (lower.includes("/raw/upload")) return true;
  try {
    const u = new URL(url);
    return u.pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

export function ResumePdfPreviewPanel({
  initialUrl = "",
}: ResumePdfPreviewPanelProps) {
  const [inputValue, setInputValue] = useState(() =>
    normalizeIncomingUrl(initialUrl),
  );
  const [activeUrl, setActiveUrl] = useState(() =>
    normalizeIncomingUrl(initialUrl),
  );

  const applyUrl = useCallback(() => {
    setActiveUrl(normalizeIncomingUrl(inputValue));
  }, [inputValue]);

  const hint = useMemo(() => {
    if (!activeUrl) {
      return "Paste a direct PDF link or open this page with ?url=… in the address bar.";
    }
    if (!looksLikePdfUrl(activeUrl)) {
      return "This may not be a PDF. If the preview is blank, confirm the link points to a PDF file.";
    }
    return null;
  }, [activeUrl]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-8 sm:px-6">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          CareerUS Solutions
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Resume PDF preview
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Enter a public PDF URL (for example the link returned after resume
          upload) to preview it in the panel below.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor="resume-pdf-url"
            className="block text-sm font-medium text-foreground"
          >
            PDF URL
          </label>
          <input
            id="resume-pdf-url"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…/resume.pdf"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyUrl();
              }
            }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-[color,box-shadow,border-color] placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>
        <button
          type="button"
          onClick={applyUrl}
          className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          Load preview
        </button>
      </div>

      {hint ? (
        <p className="rounded-lg border border-secondary/25 bg-secondary/5 px-4 py-3 text-sm text-secondary">
          {hint}
        </p>
      ) : null}

      <section
        className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        aria-label="PDF preview"
      >
        <div className="border-b border-border bg-muted/30 px-4 py-2.5">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {activeUrl || "No document loaded"}
          </p>
        </div>
        <div className="relative min-h-[60vh] flex-1 bg-muted/10">
          {activeUrl ? (
            <iframe
              title="Resume PDF preview"
              src={activeUrl}
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm font-medium text-foreground">
                No PDF to show yet
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Add a URL above or visit{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                  /view-resume?url=
                </code>{" "}
                with your encoded PDF link.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
