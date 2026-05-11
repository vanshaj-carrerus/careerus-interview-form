import type { Metadata } from "next";
import { ResumePdfPreviewPanel } from "@/components/resume-pdf-preview-panel";

export const metadata: Metadata = {
  title: "Resume preview — CareerUS Solutions",
  description: "Preview a candidate resume PDF from a public URL.",
};

type SearchParamsInput = Record<string, string | string[] | undefined>;

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ViewResumePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const sp = await searchParams;
  const initialUrl = firstString(sp.url) ?? "";

  return (
    <div className="min-h-full bg-linear-to-b from-primary/5 via-background to-secondary/5">
      <ResumePdfPreviewPanel
        key={initialUrl || "_"}
        initialUrl={initialUrl}
      />
    </div>
  );
}
