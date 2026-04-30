const DEFAULT_TARGET = "https://custech.co";

/**
 * Destination encoded in the QR code. Prefer `QR_TARGET_URL` in `.env.local` (server-only,
 * easy to rotate). Fallback: `NEXT_PUBLIC_QR_TARGET_URL`. Value can be a full URL or a
 * host like `custech.co` (https:// is added automatically).
 */
export function getQrTargetUrl(): string {
  const raw =
    process.env.QR_TARGET_URL?.trim() ||
    process.env.NEXT_PUBLIC_QR_TARGET_URL?.trim();
  if (!raw) return DEFAULT_TARGET;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

/**
 * Image in the center of the QR: `public/` path (e.g. `/logo.png`) or absolute URL.
 */
export function getQrCenterLogoSrc(): string {
  return (
    process.env.QR_CENTER_LOGO_URL?.trim() ||
    process.env.NEXT_PUBLIC_QR_CENTER_LOGO_URL?.trim() ||
    "/favicon.png"
  );
}
