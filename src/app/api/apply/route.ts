import { after } from "next/server";
import { getDb } from "@/lib/mongodb";
import { uploadPdf } from "@/lib/cloudinary";
import { appendToSheet } from "@/lib/googleSheet";

export const runtime = "nodejs";

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB

// Filled in by the candidate: all required.
const REQUIRED_FIELDS = [
  "positionApplyingFor",
  "date",
  "fullName",
  "contactNumber",
  "emailAddress",
  "currentAddress",
  "whyJoinUs",
  "knowledgeOfJobRole",
  "whyChangeJob",
  "whyHireYou",
  "currentLastEmployer",
  "salaryExpectations",
  "nightShiftWilling",
  "idealWorkEnvironment",
  "referenceNameAndContact",
  "medicalIssues",
  "joiningDate",
] as const;

// Filled in by the interviewer: optional.
const OPTIONAL_FIELDS = ["interviewerRemarks", "interviewerName", "signature"] as const;

const TEXT_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "Invalid form data" }, { status: 400 });
  }

  // Which form sent this: decides which Google Sheet receives the row.
  const sourceRaw = String(form.get("source") ?? "");
  if (sourceRaw !== "careerus" && sourceRaw !== "custech") {
    return Response.json({ ok: false, error: "Unknown form source" }, { status: 400 });
  }
  const source = sourceRaw;

  const data = Object.fromEntries(
    TEXT_FIELDS.map((key) => [key, String(form.get(key) ?? "").trim()]),
  ) as Record<(typeof TEXT_FIELDS)[number], string>;

  const missing = REQUIRED_FIELDS.filter((key) => !data[key]);
  if (missing.length) {
    return Response.json(
      { ok: false, error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }
  if (!/^\S+@\S+\.\S+$/.test(data.emailAddress)) {
    return Response.json({ ok: false, error: "Invalid email address" }, { status: 400 });
  }
  const nightShift = data.nightShiftWilling.toLowerCase();
  if (nightShift !== "yes" && nightShift !== "no") {
    return Response.json({ ok: false, error: "Please answer the night shift question" }, { status: 400 });
  }
  data.nightShiftWilling = nightShift === "yes" ? "Yes" : "No";

  let skills: string[] = [];
  try {
    const parsed = JSON.parse(String(form.get("skills") ?? "[]"));
    if (Array.isArray(parsed)) skills = parsed.map(String).map((s) => s.trim()).filter(Boolean);
  } catch {
    // ignore malformed skills, treat as empty
  }
  if (!skills.length) {
    return Response.json({ ok: false, error: "Please add at least one skill" }, { status: 400 });
  }

  // Resume upload (required)
  const resume = form.get("resume");
  if (!(resume instanceof File) || resume.size === 0) {
    return Response.json({ ok: false, error: "Please upload your resume (PDF)" }, { status: 400 });
  }
  const isPdf = resume.type === "application/pdf" || /\.pdf$/i.test(resume.name);
  if (!isPdf) {
    return Response.json({ ok: false, error: "Resume must be a PDF" }, { status: 400 });
  }
  if (resume.size > MAX_RESUME_BYTES) {
    return Response.json({ ok: false, error: "Resume must be 5 MB or smaller" }, { status: 400 });
  }
  let resumeUrl: string;
  let resumePublicId: string;
  try {
    const buffer = Buffer.from(await resume.arrayBuffer());
    const uploaded = await uploadPdf(buffer, resume.name);
    resumeUrl = uploaded.secure_url;
    resumePublicId = uploaded.public_id;
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    const detail =
      process.env.NODE_ENV !== "production" && err && typeof err === "object" && "message" in err
        ? ` (${String(err.message)})`
        : "";
    return Response.json({ ok: false, error: `Could not upload resume${detail}` }, { status: 502 });
  }

  const submittedAt = new Date();
  const doc = {
    ...data,
    submittedFrom: source,
    skills,
    resumeFileName: resume.name,
    resumeUrl,
    resumePublicId,
    submittedAt,
    sheetSynced: false,
  };

  // MongoDB is the source of truth.
  let insertedId;
  try {
    const db = await getDb();
    const result = await db.collection("applications").insertOne(doc);
    insertedId = result.insertedId;
  } catch (err) {
    console.error("MongoDB insert failed", err);
    // Safe hints (no secrets) so config problems are visible from the browser.
    const name = err instanceof Error ? err.name : "";
    const message = err instanceof Error ? err.message : "";
    const hint = message.includes("MONGODB_URI is not set")
      ? " (server is missing MONGODB_URI)"
      : name === "MongoServerSelectionError" || name === "MongoNetworkError"
        ? " (cannot reach database: check MongoDB Atlas Network Access)"
        : name === "MongoServerError" && /auth/i.test(message)
          ? " (database login failed: check MONGODB_URI user/password)"
          : "";
    return Response.json({ ok: false, error: `Could not save application${hint}` }, { status: 500 });
  }

  // Cloudinary's own PDF link is blocked for public delivery, so the sheet gets
  // our /api/resume/<id> link, which serves the file through a signed URL.
  const appUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const sheetResumeUrl = resumePublicId ? `${appUrl}/api/resume/${insertedId.toString()}` : "";

  // Google Sheet is a mirror: sync it after responding so the candidate doesn't
  // wait on Apps Script. A failure here leaves sheetSynced: false in MongoDB.
  after(async () => {
    try {
      await appendToSheet(source, {
        id: insertedId.toString(),
        submittedAt: submittedAt.toISOString(),
        ...data,
        skills: skills.join(", "),
        resumeUrl: sheetResumeUrl,
      });
      const db = await getDb();
      await db.collection("applications").updateOne({ _id: insertedId }, { $set: { sheetSynced: true } });
    } catch (err) {
      console.error("Google Sheet sync failed:", err);
    }
  });

  return Response.json({ ok: true, id: insertedId.toString() });
}
