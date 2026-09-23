import { NextResponse } from "next/server";
import {
  APPLICATIONS_SESSION_COOKIE,
  APPLICATIONS_SESSION_TTL_SECONDS,
  checkCredentials,
  createSessionToken,
} from "@/lib/applications-auth";

type LoginBody = { username?: string; password?: string };

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password || !checkCredentials(username, password)) {
    return NextResponse.json(
      { ok: false, error: "Incorrect username or password." },
      { status: 401 },
    );
  }

  const token = await createSessionToken(username);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(APPLICATIONS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: APPLICATIONS_SESSION_TTL_SECONDS,
  });
  return response;
}
