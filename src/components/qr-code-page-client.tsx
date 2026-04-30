"use client";

import { useRef } from "react";
import { QrCodeDisplay } from "@/components/qr-code-display";

type Props = {
  targetUrl: string;
  logoSrc: string;
};

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function QrCodePageClient({ targetUrl, logoSrc }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const getSvg = () =>
    wrapperRef.current?.querySelector<SVGSVGElement>('[data-qr-wrapper] svg') ??
    null;

  const svgToDataUrl = (svgText: string) =>
    `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgText)))}`;

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load image: ${src}`));
      img.src = src;
    });

  const getQrSize = (svg: SVGSVGElement) =>
    Number(svg.getAttribute("width")) || svg.viewBox.baseVal.width || 320;

  const getLogoMetrics = (qrSize: number) => {
    const logoSize = Math.round(qrSize * 0.16);
    const logoFrame = logoSize + 8;
    const center = qrSize / 2;
    const logoX = center - logoSize / 2;
    const logoY = center - logoSize / 2;
    const frameX = center - logoFrame / 2;
    const frameY = center - logoFrame / 2;
    return { logoSize, logoX, logoY, logoFrame, frameX, frameY };
  };

  const handleDownloadSvg = async () => {
    const svg = getSvg();
    if (!svg) return;

    const qrSize = getQrSize(svg);
    const qrSvgMarkup = new XMLSerializer().serializeToString(svg);
    const qrDataUrl = svgToDataUrl(qrSvgMarkup);
    const logoImg = await loadImage(logoSrc);
    const { logoSize, logoX, logoY, logoFrame, frameX, frameY } =
      getLogoMetrics(qrSize);

    const mergedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">
  <rect width="${qrSize}" height="${qrSize}" fill="#ffffff" />
  <image href="${qrDataUrl}" x="0" y="0" width="${qrSize}" height="${qrSize}" />
  <rect x="${frameX}" y="${frameY}" width="${logoFrame}" height="${logoFrame}" rx="10" ry="10" fill="#ffffff" />
  <image href="${logoImg.src}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />
</svg>`;
    const svgWithXml = mergedSvg.startsWith("<?xml")
      ? mergedSvg
      : `<?xml version="1.0" encoding="UTF-8"?>\n${mergedSvg}`;
    downloadTextFile("careerus-application-qr.svg", svgWithXml, "image/svg+xml");
  };

  const handleDownloadPng = async () => {
    const svg = getSvg();
    if (!svg) return;

    const serialized = new XMLSerializer().serializeToString(svg);
    const qrImage = await loadImage(svgToDataUrl(serialized));
    const logoImage = await loadImage(logoSrc);
    const svgWidth = getQrSize(svg);
    const { logoSize, logoX, logoY, logoFrame, frameX, frameY } =
      getLogoMetrics(svgWidth);
    const scale = 12; // ~3840px output when SVG is ~320px
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(svgWidth * scale);
    canvas.height = Math.round(svgWidth * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(qrImage, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      frameX * scale,
      frameY * scale,
      logoFrame * scale,
      logoFrame * scale,
    );
    ctx.drawImage(
      logoImage,
      logoX * scale,
      logoY * scale,
      logoSize * scale,
      logoSize * scale,
    );

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "careerus-application-qr.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <>
      <div ref={wrapperRef} className="mt-10 flex justify-center">
        <QrCodeDisplay targetUrl={targetUrl} logoSrc={logoSrc} size={320} />
      </div>

      <div className="mt-8 rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-4">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-secondary">
          Download QR code
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Download SVG (best quality)
          </button>
          <button
            type="button"
            onClick={() => {
              void handleDownloadPng();
            }}
            className="rounded-lg border border-primary/30 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/5"
          >
            Download PNG (high-res)
          </button>
        </div>
      </div>
    </>
  );
}
