import type { Metadata } from "next";
import { QrCodePageClient } from "@/components/qr-code-page-client";
import { getQrCenterLogoSrc, getQrTargetUrl } from "@/lib/qr-config";

export const metadata: Metadata = {
  title: "Application QR code — CareerUS Solutions",
  description:
    "Scan to open the CareerUS job application. Destination is configurable via environment variables.",
};

export default function QrCodePage() {
  const targetUrl = getQrTargetUrl();
  const logoSrc = getQrCenterLogoSrc();

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-linear-to-b from-primary/10 via-background to-secondary/10 px-4 py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-xl sm:p-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          CareerUS Solutions
        </p>
        <h1 className="mt-3 text-center text-2xl font-bold text-foreground sm:text-3xl">
          Scan to open the form
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Point your camera at the code to visit the application page.
        </p>

        <QrCodePageClient targetUrl={targetUrl} logoSrc={logoSrc} />
      </div>
    </div>
  );
}
