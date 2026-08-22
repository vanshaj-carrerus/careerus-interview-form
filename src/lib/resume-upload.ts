import type { NextRequest } from "next/server";

import {
  isMongoConfigured,
  uploadResumeToMongoFallback,
} from "@/lib/resume-mongo-fallback";

const SIRV_UPLOAD_FOLDER = "/careerus/interview-forms";

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
  uploadFileName: string;
  sirvPath: string;
};

export function buildResumeFileMeta(file: File, buffer: Buffer): ResumeFileMeta {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  const ext = getFileExtension(file.name);
  const safeName = sanitizeFileName(file.name) || "resume";
  const timestampPrefix = Date.now();
  const uploadFileName = ext
    ? `${timestampPrefix}_${safeName}.${ext}`
    : `${timestampPrefix}_${safeName}`;
  const sirvPath = `${SIRV_UPLOAD_FOLDER.replace(/\/+$/, "")}/${uploadFileName}`;

  return {
    buffer,
    isImage,
    isPdf,
    ext,
    safeName,
    timestampPrefix,
    uploadFileName,
    sirvPath,
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

function isConfiguredValue(value: string | undefined) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "your-sirv-client-id" || trimmed === "your-sirv-client-secret") {
    return false;
  }
  return !/your-(sirv|account)|placeholder|example|demo/i.test(trimmed);
}

function isSirvConfigured() {
  return !!(
    isConfiguredValue(process.env.SIRV_CLIENT_ID) &&
    isConfiguredValue(process.env.SIRV_CLIENT_SECRET) &&
    (isConfiguredValue(process.env.SIRV_PUBLIC_URL) ||
      isConfiguredValue(process.env.SIRV_ACCOUNT_ALIAS))
  );
}

function getSirvPublicBaseUrl() {
  const configuredUrl = process.env.SIRV_PUBLIC_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const alias = process.env.SIRV_ACCOUNT_ALIAS?.trim();
  if (alias) {
    return `https://${alias}.sirv.com`;
  }

  return "";
}

async function getSirvBearerToken() {
  const clientId = process.env.SIRV_CLIENT_ID?.trim();
  const clientSecret = process.env.SIRV_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Sirv client credentials are missing.");
  }

  const response = await fetch("https://api.sirv.com/v2/token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Sirv token request failed: ${response.status} ${detail}`.slice(0, 500),
    );
  }

  const payload = (await response.json()) as { token?: string; error?: string };
  if (!payload.token) {
    throw new Error(payload.error ?? "Sirv token request failed.");
  }

  return payload.token;
}

async function uploadToSirv(meta: ResumeFileMeta): Promise<string> {
  const baseUrl = getSirvPublicBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "Sirv public URL is missing. Set SIRV_PUBLIC_URL or SIRV_ACCOUNT_ALIAS.",
    );
  }

  const token = await getSirvBearerToken();
  const normalizedPath = meta.sirvPath.startsWith("/")
    ? meta.sirvPath
    : `/${meta.sirvPath}`;
  const filename = encodeURIComponent(normalizedPath);

  const response = await fetch(
    `https://api.sirv.com/v2/files/upload?filename=${filename}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(meta.buffer),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Sirv upload failed: ${response.status} ${detail}`.slice(0, 500),
    );
  }

  return `${baseUrl}${normalizedPath}`;
}

export type ResumeUploadResult = {
  url: string;
  provider?: "sirv" | "mongodb";
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

  const isDocx =
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  let sirvError: unknown = null;
  if (isDocx) {
    sirvError = new Error(
      "Sirv does not accept DOCX files; routed directly to MongoDB.",
    );
  } else if (isSirvConfigured()) {
    try {
      const url = await uploadToSirv(meta);
      return { url, provider: "sirv" };
    } catch (error) {
      console.error("Sirv upload failed:", error);
      sirvError = error;
    }
  } else {
    sirvError = new Error(
      "Sirv storage is not configured. Set the real SIRV_CLIENT_ID, SIRV_CLIENT_SECRET, and SIRV_PUBLIC_URL or SIRV_ACCOUNT_ALIAS values before uploading.",
    );
  }

  if (isMongoConfigured()) {
    try {
      const origin = req.nextUrl.origin;
      const url = await uploadResumeToMongoFallback(meta, file, origin);
      return { url, provider: "mongodb" };
    } catch (mongoError) {
      console.error("MongoDB fallback upload failed:", mongoError);
      throw new Error(
        `Resume upload failed. Sirv error: ${errorMessage(sirvError)}. MongoDB fallback error: ${errorMessage(mongoError)}`,
      );
    }
  }

  throw new Error(
    `Resume upload failed and no fallback storage is configured. Sirv error: ${errorMessage(sirvError)}`,
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class ResumeUploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeUploadValidationError";
  }
}
