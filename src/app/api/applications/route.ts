import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb";
import { listInterviewSubmissions } from "@/lib/interview-submissions";
import type { SubmissionSource } from "@/types/application-submission";

function parseSource(value: string | null): SubmissionSource | undefined {
  if (value === "careerus" || value === "custech") return value;
  return undefined;
}

export async function GET(request: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Database is not configured. Set MONGODB_URI in .env.local.",
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const source = parseSource(searchParams.get("source"));

  try {
    const submissions = await listInterviewSubmissions(source);
    return NextResponse.json({ ok: true, submissions });
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch applications." },
      { status: 500 },
    );
  }
}
