"use client";

import QRCode from "react-qr-code";

type Props = {
  targetUrl: string;
  logoSrc: string;
  /** QR SVG size in pixels */
  size?: number;
};

export function QrCodeDisplay({
  targetUrl,
  logoSrc,
  size = 280,
}: Props) {
  // Keep center logo small so scanners can decode quickly.
  const logoBox = Math.round(size * 0.16);

  return (
    <div
      data-qr-wrapper
      className="relative inline-flex rounded-2xl bg-white p-5 shadow-lg ring-1 ring-border"
      style={{ width: size + 40 }}
    >
      <QRCode
        value={targetUrl}
        size={size}
        level="H"
        className="h-auto max-w-full"
        fgColor="#000000"
        bgColor="#ffffff"
      />
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center p-5"
        aria-hidden
      >
        <div
          className="flex items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-2 ring-white"
          style={{ width: logoBox + 8, height: logoBox + 8 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic logo URL from env */}
          <img
            src={logoSrc}
            alt=""
            width={logoBox}
            height={logoBox}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
