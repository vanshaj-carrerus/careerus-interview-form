import { NextResponse } from "next/server";
import { Readable } from "stream";

import { getResumeFallbackFileByToken } from "@/lib/resume-mongo-fallback";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const file = await getResumeFallbackFileByToken(token).catch((error) => {
    console.error("Failed to read resume fallback file:", error);
    return null;
  });

  if (!file) {
    return NextResponse.json(
      { error: "This resume link has expired or does not exist." },
      { status: 404 },
    );
  }

  const webStream = Readable.toWeb(
    file.stream,
  ) as unknown as ReadableStream<Uint8Array>;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
