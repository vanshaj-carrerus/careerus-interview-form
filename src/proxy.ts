import { NextResponse, type NextRequest } from "next/server";
import {
  APPLICATIONS_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/applications-auth";

// Left open so the login form and its API can be reached without a session.
const PUBLIC_PATHS = new Set([
  "/applications/login",
  "/api/applications/login",
  "/api/applications/logout",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(APPLICATIONS_SESSION_COOKIE)?.value;
  const isAuthenticated = await verifySessionToken(token);

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Please sign in." },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/applications/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/applications",
    "/applications/:path*",
    "/api/applications",
    "/api/applications/:path*",
  ],
};
