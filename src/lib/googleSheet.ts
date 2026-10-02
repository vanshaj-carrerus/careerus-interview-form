export type SheetSource = "careerus" | "custech";

// Each form has its own sheet / Apps Script deployment (see apps-script/Code.gs).
export function sheetEnvFor(source: SheetSource) {
  return source === "custech"
    ? { url: process.env.CUSTECH_SHEET_SCRIPT_URL, secret: process.env.CUSTECH_SHEET_SCRIPT_SECRET || process.env.GOOGLE_SCRIPT_SECRET }
    : { url: process.env.GOOGLE_SHEET_SCRIPT_URL, secret: process.env.GOOGLE_SCRIPT_SECRET };
}

// Sends one row to the Google Apps Script web app (see apps-script/Code.gs).
export async function appendToSheet(source: SheetSource, row: Record<string, unknown>) {
  const { url, secret } = sheetEnvFor(source);
  if (!url) {
    throw new Error(`${source === "custech" ? "CUSTECH_SHEET_SCRIPT_URL" : "GOOGLE_SHEET_SCRIPT_URL"} is not set`);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, ...row }),
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  let data: { ok?: boolean; error?: string } = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Apps Script returned non-JSON response (status ${res.status})`);
  }
  if (!data.ok) throw new Error(data.error || "Apps Script rejected the row");
}
