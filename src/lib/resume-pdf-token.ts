import { createHmac, timingSafeEqual } from "crypto";

export type ResumePdfTokenPayload = {
  publicId: string;
  format: string;
  resourceType: "image" | "raw";
  exp: number;
};

function signingString(payload: ResumePdfTokenPayload) {
  return `${payload.publicId}\n${payload.format}\n${payload.resourceType}\n${payload.exp}`;
}

export function signResumePdfToken(
  payload: ResumePdfTokenPayload,
  secret: string,
): string {
  const sig = createHmac("sha256", secret)
    .update(signingString(payload))
    .digest("hex");
  const body = JSON.stringify({ ...payload, sig });
  return Buffer.from(body, "utf8").toString("base64url");
}

export function verifyResumePdfToken(
  token: string,
  secret: string,
): ResumePdfTokenPayload | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as ResumePdfTokenPayload & { sig: string };
    const { sig, ...rest } = parsed;
    if (
      typeof rest.publicId !== "string" ||
      typeof rest.format !== "string" ||
      (rest.resourceType !== "image" && rest.resourceType !== "raw") ||
      typeof rest.exp !== "number" ||
      typeof sig !== "string"
    ) {
      return null;
    }
    const payload = rest as ResumePdfTokenPayload;
    const expected = createHmac("sha256", secret)
      .update(signingString(payload))
      .digest("hex");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
