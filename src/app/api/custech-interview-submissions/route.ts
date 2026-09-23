import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb";
import { saveInterviewSubmission } from "@/lib/interview-submissions";

type SubmissionBody = Record<string, unknown>;

export async function POST(request: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Database is not configured. Set MONGODB_URI in .env.local.",
      },
      { status: 500 },
    );
  }

  let payload: SubmissionBody;
  try {
    payload = (await request.json()) as SubmissionBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  try {
    await saveInterviewSubmission(payload, "custech");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save interview submission:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save submission to the database." },
      { status: 500 },
    );
  }
}
