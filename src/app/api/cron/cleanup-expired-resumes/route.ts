import { NextRequest, NextResponse } from "next/server";

import { deleteExpiredResumeFallbacks } from "@/lib/resume-mongo-fallback";

export async function GET(req: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (configuredSecret) {
    const providedSecret =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.nextUrl.searchParams.get("secret");
    if (providedSecret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const deletedCount = await deleteExpiredResumeFallbacks();
    return NextResponse.json({ ok: true, deletedCount });
  } catch (error) {
    console.error("Failed to clean up expired resume fallbacks:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 },
    );
  }
}
