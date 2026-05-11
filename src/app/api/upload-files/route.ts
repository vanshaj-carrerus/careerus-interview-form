import { NextRequest, NextResponse } from "next/server";
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from "cloudinary";
import { signResumePdfToken } from "@/lib/resume-pdf-token";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function getFileExtension(name: string) {
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts.pop()?.toLowerCase() ?? "";
}

function getRequestOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (!host) {
    return new URL(req.url).origin;
  }
  return `${proto}://${host}`;
}

function resumePdfTokenSecret() {
  return (
    process.env.RESUME_PDF_TOKEN_SECRET ?? process.env.CLOUDINARY_API_SECRET
  );
}

export async function POST(req: NextRequest) {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { url: null, error: "Cloudinary configuration is missing" },
        { status: 500 },
      );
    }

    // Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { url: null, error: "No file provided" },
        { status: 400 },
      );
    }

    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    const allowedDocumentTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedTypes = [...allowedImageTypes, ...allowedDocumentTypes];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          url: null,
          error:
            "Invalid file type. Allowed: PDF, DOC, DOCX, JPEG, PNG, GIF, WebP, SVG.",
        },
        { status: 400 },
      );
    }

    // Validate file size (10MB for images, 20MB for documents)
    const maxSize = file.type.startsWith("image/")
      ? 10 * 1024 * 1024
      : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        {
          url: null,
          error: `File size exceeds ${maxSizeMB}MB limit`,
        },
        { status: 400 },
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const ext = getFileExtension(file.name);
    const safeName = sanitizeFileName(file.name) || "resume";
    const timestampPrefix = Date.now();
    const documentPublicId = ext
      ? `${timestampPrefix}_${safeName}.${ext}`
      : `${timestampPrefix}_${safeName}`;

    // PDFs use resource_type "image" in Cloudinary. Public res.cloudinary.com
    // URLs for PDFs still return 401 on many plans; we return an app proxy URL
    // that streams via Cloudinary's authenticated download API.
    // DOC/DOCX stay as raw so filenames keep .doc/.docx for downloads.
    const resourceType: "image" | "raw" = isImage || isPdf ? "image" : "raw";
    const publicId =
      isImage || isPdf
        ? `${timestampPrefix}_${safeName}`
        : documentPublicId;

    // Upload to Cloudinary
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "careerus/interview-forms",
          resource_type: resourceType,
          public_id: publicId,
          use_filename: false,
          unique_filename: false,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) reject(error);
          else resolve(result as UploadApiResponse);
        },
      );
      uploadStream.end(buffer);
    });

    if (isPdf) {
      const secret = resumePdfTokenSecret();
      if (!secret) {
        return NextResponse.json(
          { url: null, error: "Server configuration is incomplete." },
          { status: 500 },
        );
      }
      const format = (result.format ?? "pdf").toLowerCase();
      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10;
      const token = signResumePdfToken(
        {
          publicId: result.public_id,
          format,
          resourceType: "image",
          exp,
        },
        secret,
      );
      const origin = getRequestOrigin(req);
      const url = `${origin}/api/resume-pdf?t=${encodeURIComponent(token)}`;
      return NextResponse.json({ url });
    }

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error uploading file";
    return NextResponse.json(
      { url: null, error: errorMessage },
      { status: 500 },
    );
  }
}
