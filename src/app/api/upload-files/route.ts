import { NextRequest, NextResponse } from "next/server";
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from "cloudinary";

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
    const ext = getFileExtension(file.name);
    const safeName = sanitizeFileName(file.name) || "resume";
    const timestampPrefix = Date.now();
    const documentPublicId = ext
      ? `${timestampPrefix}_${safeName}.${ext}`
      : `${timestampPrefix}_${safeName}`;

    // Upload to Cloudinary
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "careerus/interview-forms",
          resource_type: isImage ? "image" : "raw",
          // For documents we include extension in public_id so downloaded files
          // keep .pdf/.docx and open correctly.
          public_id: isImage
            ? `${timestampPrefix}_${safeName}`
            : documentPublicId,
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
