import ImageKit, { toFile } from "@imagekit/nodejs";
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from "cloudinary";
import type { NextRequest } from "next/server";
import { signResumePdfToken } from "@/lib/resume-pdf-token";

import { CLOUD_STORAGE_FULL_MESSAGE } from "@/lib/resume-upload-constants";

const CLOUDINARY_FOLDER = "careerus/interview-forms";
const IMAGEKIT_FOLDER = "/careerus/interview-forms";

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

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function getFileExtension(name: string) {
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts.pop()?.toLowerCase() ?? "";
}

export type ResumeFileMeta = {
  buffer: Buffer;
  isImage: boolean;
  isPdf: boolean;
  ext: string;
  safeName: string;
  timestampPrefix: number;
  documentPublicId: string;
  publicId: string;
  resourceType: "image" | "raw";
  uploadFileName: string;
};

export function buildResumeFileMeta(file: File, buffer: Buffer): ResumeFileMeta {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  const ext = getFileExtension(file.name);
  const safeName = sanitizeFileName(file.name) || "resume";
  const timestampPrefix = Date.now();
  const documentPublicId = ext
    ? `${timestampPrefix}_${safeName}.${ext}`
    : `${timestampPrefix}_${safeName}`;
  const resourceType: "image" | "raw" = isImage || isPdf ? "image" : "raw";
  const publicId =
    isImage || isPdf ? `${timestampPrefix}_${safeName}` : documentPublicId;
  const uploadFileName = ext
    ? `${timestampPrefix}_${safeName}.${ext}`
    : `${timestampPrefix}_${safeName}`;

  return {
    buffer,
    isImage,
    isPdf,
    ext,
    safeName,
    timestampPrefix,
    documentPublicId,
    publicId,
    resourceType,
    uploadFileName,
  };
}

export function validateResumeFile(file: File):
  | { ok: true }
  | { ok: false; error: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false,
      error:
        "Invalid file type. Allowed: PDF, DOC, DOCX, JPEG, PNG, GIF, WebP, SVG.",
    };
  }

  const maxSize = file.type.startsWith("image/")
    ? 10 * 1024 * 1024
    : 20 * 1024 * 1024;
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      ok: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  return { ok: true };
}

function isCloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function isImageKitConfigured() {
  return !!process.env.IMAGEKIT_PRIVATE_KEY;
}

function resumePdfTokenSecret() {
  return (
    process.env.RESUME_PDF_TOKEN_SECRET ?? process.env.CLOUDINARY_API_SECRET
  );
}

function getRequestOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (!host) {
    return new URL(req.url).origin;
  }
  return `${proto}://${host}`;
}

async function uploadToCloudinary(
  meta: ResumeFileMeta,
  req: NextRequest,
): Promise<string> {
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: meta.resourceType,
        public_id: meta.publicId,
        use_filename: false,
        unique_filename: false,
      },
      (
        error: UploadApiErrorResponse | undefined,
        uploadResult: UploadApiResponse | undefined,
      ) => {
        if (error) reject(error);
        else resolve(uploadResult as UploadApiResponse);
      },
    );
    uploadStream.end(meta.buffer);
  });

  if (meta.isPdf) {
    const secret = resumePdfTokenSecret();
    if (!secret) {
      throw new Error("Server configuration is incomplete.");
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
    return `${origin}/api/resume-pdf?t=${encodeURIComponent(token)}`;
  }

  return result.secure_url;
}

async function uploadToImageKit(meta: ResumeFileMeta): Promise<string> {
  const client = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  });

  const response = await client.files.upload({
    file: await toFile(meta.buffer, meta.uploadFileName),
    fileName: meta.uploadFileName,
    folder: IMAGEKIT_FOLDER,
    useUniqueFileName: true,
  });

  if (!response.url) {
    throw new Error("ImageKit upload returned no URL");
  }

  return response.url;
}

export type ResumeUploadResult = {
  url: string;
  provider?: "cloudinary" | "imagekit";
  cloudFull?: boolean;
};

export async function uploadResumeWithFallback(
  file: File,
  req: NextRequest,
): Promise<ResumeUploadResult> {
  const validation = validateResumeFile(file);
  if (!validation.ok) {
    throw new ResumeUploadValidationError(validation.error);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const meta = buildResumeFileMeta(file, buffer);

  if (isCloudinaryConfigured()) {
    try {
      const url = await uploadToCloudinary(meta, req);
      return { url, provider: "cloudinary" };
    } catch (error) {
      console.error("Cloudinary upload failed, trying ImageKit:", error);
    }
  }

  if (isImageKitConfigured()) {
    try {
      const url = await uploadToImageKit(meta);
      return { url, provider: "imagekit" };
    } catch (error) {
      console.error("ImageKit upload failed:", error);
    }
  }

  return { url: CLOUD_STORAGE_FULL_MESSAGE, cloudFull: true };
}

export class ResumeUploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeUploadValidationError";
  }
}
