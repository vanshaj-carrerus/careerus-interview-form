import { NextResponse } from "next/server";

type SubmissionBody = Record<string, unknown>;

function getScriptUrl() {
  return process.env.CUSTECH_SHEET_SCRIPT_URL?.trim() ?? "";
}

export async function POST(request: Request) {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Google Sheet script URL is missing. Set CUSTECH_SHEET_SCRIPT_URL in .env.local.",
      },
      { status: 500 },
    );
  }

  let payload: SubmissionBody;
  try {
    payload = (await request.json()) as SubmissionBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Google Script responded with status ${response.status}.`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to reach Google Script endpoint. Check deployment and internet connection.",
      },
      { status: 502 },
    );
  }
}
