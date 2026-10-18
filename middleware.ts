import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session-config";

// Page protection (docs/02-pondscale.md step 4A rule 2): every page except
// /login and /signup needs a session. This is the FIRST gate — each server
// action and page re-checks the session itself, never trusting the UI
// (docs/00-global.md §3). Edge-safe: only iron-session Web Crypto, no
// Prisma, no next/headers.

const PUBLIC_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path);

  if (!isPublic && !session.userId) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isPublic && session.userId) {
    // Already logged in — no dead end from the login screen.
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  // Pages only: skip API routes, Next internals and any file with an extension.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
