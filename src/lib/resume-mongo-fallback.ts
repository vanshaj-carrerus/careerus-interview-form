import { randomUUID } from "crypto";
import { GridFSBucket, ObjectId } from "mongodb";
import { Readable } from "stream";

import { getMongoDb, isMongoConfigured } from "@/lib/mongodb";
import type { ResumeFileMeta } from "@/lib/resume-upload";

export { isMongoConfigured };

const BUCKET_NAME = "resumeFallbacks";
export const RESUME_FALLBACK_TTL_DAYS = 30;

type ResumeFallbackMetadata = {
  token: string;
  contentType: string;
  originalName: string;
  createdAt: Date;
  expiresAt: Date;
};

let indexesEnsured = false;

async function getBucket() {
  const db = await getMongoDb();

  if (!indexesEnsured) {
    indexesEnsured = true;
    await db
      .collection(`${BUCKET_NAME}.files`)
      .createIndex({ "metadata.token": 1 }, { unique: true })
      .catch(() => {});
    await db
      .collection(`${BUCKET_NAME}.files`)
      .createIndex({ "metadata.expiresAt": 1 })
      .catch(() => {});
  }

  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export async function uploadResumeToMongoFallback(
  meta: ResumeFileMeta,
  file: File,
  origin: string,
): Promise<string> {
  const bucket = await getBucket();

  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + RESUME_FALLBACK_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const metadata: ResumeFallbackMetadata = {
    token,
    contentType: file.type || "application/octet-stream",
    originalName: file.name || meta.uploadFileName,
    createdAt: now,
    expiresAt,
  };

  await new Promise<void>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(meta.uploadFileName, {
      metadata,
    });
    uploadStream.once("error", reject);
    uploadStream.once("finish", () => resolve());
    Readable.from(meta.buffer).pipe(uploadStream);
  });

  return `${origin.replace(/\/+$/, "")}/uploads/resumes/${token}`;
}

export type ResumeFallbackFile = {
  stream: Readable;
  contentType: string;
  filename: string;
};

export async function getResumeFallbackFileByToken(
  token: string,
): Promise<ResumeFallbackFile | null> {
  const db = await getMongoDb();
  const filesCollection = db.collection<{
    _id: ObjectId;
    filename: string;
    metadata: ResumeFallbackMetadata;
  }>(`${BUCKET_NAME}.files`);

  const fileDoc = await filesCollection.findOne({ "metadata.token": token });
  if (!fileDoc) {
    return null;
  }

  if (new Date(fileDoc.metadata.expiresAt).getTime() <= Date.now()) {
    const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    await bucket.delete(fileDoc._id).catch(() => {});
    return null;
  }

  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  return {
    stream: bucket.openDownloadStream(fileDoc._id),
    contentType: fileDoc.metadata.contentType,
    filename: fileDoc.metadata.originalName || fileDoc.filename,
  };
}

export async function deleteExpiredResumeFallbacks(): Promise<number> {
  const db = await getMongoDb();
  const filesCollection = db.collection<{
    _id: ObjectId;
    metadata: ResumeFallbackMetadata;
  }>(`${BUCKET_NAME}.files`);

  const expired = await filesCollection
    .find({ "metadata.expiresAt": { $lte: new Date() } })
    .project({ _id: 1 })
    .toArray();

  if (expired.length === 0) {
    return 0;
  }

  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  await Promise.all(
    expired.map((doc) => bucket.delete(doc._id).catch(() => {})),
  );

  return expired.length;
}
