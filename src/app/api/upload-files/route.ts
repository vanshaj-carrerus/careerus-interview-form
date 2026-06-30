import { NextRequest, NextResponse } from "next/server";
import {
  ResumeUploadValidationError,
  uploadResumeWithFallback,
} from "@/lib/resume-upload";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { url: null, error: "No file provided" },
        { status: 400 },
      );
    }

    const result = await uploadResumeWithFallback(file, req);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ResumeUploadValidationError) {
      return NextResponse.json(
        { url: null, error: error.message },
        { status: 400 },
      );
    }

    console.error("Upload Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error uploading file";
    return NextResponse.json(
      { url: null, error: errorMessage },
      { status: 500 },
    );
  }
}
