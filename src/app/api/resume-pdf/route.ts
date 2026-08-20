import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  const directUrl = req.nextUrl.searchParams.get("url");

  if (directUrl) {
    try {
      const upstream = await fetch(directUrl, { cache: "no-store" });
      if (!upstream.ok) {
        return NextResponse.json(
          { error: "Could not retrieve the PDF from storage." },
          { status: 502 },
        );
      }

      const headers = new Headers();
      headers.set("Content-Type", "application/pdf");
      headers.set("Content-Disposition", 'inline; filename="resume.pdf"');
      headers.set("Cache-Control", "private, max-age=300");
      return new NextResponse(upstream.body, { status: 200, headers });
    } catch {
      return NextResponse.json(
        { error: "Could not reach Sirv storage." },
        { status: 502 },
      );
    }
  }

  if (token) {
    return NextResponse.json(
      { error: "Signed resume links are deprecated. Use a direct Sirv URL." },
      { status: 410 },
    );
  }

  return NextResponse.json(
    {
      error:
        "Resume PDF download route is deprecated. Use a direct Sirv asset URL instead.",
    },
    { status: 410 },
  );
}
