import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { verifyResumePdfToken } from "@/lib/resume-pdf-token";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function tokenSecret() {
  return (
    process.env.RESUME_PDF_TOKEN_SECRET ?? process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Streams a resume PDF from Cloudinary using the authenticated download API.
 * Public CDN URLs for PDFs often return 401 ("deny or ACL failure") on
 * restricted product environments; this route bypasses that for our app.
 */
export async function GET(req: NextRequest) {
  const secret = tokenSecret();
  if (
    !secret ||
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 500 },
    );
  }

  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.json(
      { error: "Missing token query parameter." },
      { status: 400 },
    );
  }

  const payload = verifyResumePdfToken(token, secret);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired link." },
      { status: 403 },
    );
  }

  const cloudinaryExpires = Math.floor(Date.now() / 1000) + 60 * 60;
  const downloadUrl = cloudinary.utils.private_download_url(
    payload.publicId,
    payload.format,
    {
      resource_type: payload.resourceType,
      type: "upload",
      expires_at: cloudinaryExpires,
    },
  );

  let upstream: Response;
  try {
    upstream = await fetch(downloadUrl, { cache: "no-store" });
  } catch {
    return NextResponse.json(
      { error: "Could not reach Cloudinary." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const detail = upstream.headers.get("x-cld-error") ?? upstream.statusText;
    console.error("resume-pdf Cloudinary fetch failed:", upstream.status, detail);
    return NextResponse.json(
      { error: "Could not retrieve the PDF from storage." },
      { status: 502 },
    );
  }

  const body = upstream.body;
  if (!body) {
    return NextResponse.json(
      { error: "Empty response from storage." },
      { status: 502 },
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", 'inline; filename="resume.pdf"');
  headers.set("Cache-Control", "private, max-age=300");

  const len = upstream.headers.get("content-length");
  if (len) {
    headers.set("Content-Length", len);
  }

  return new NextResponse(body, { status: 200, headers });
}
