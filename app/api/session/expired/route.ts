import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";

// Clears a session that points at an account which no longer exists, then
// sends the browser to the login screen. Only reachable from the app layout's
// guard; it does nothing else.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/login?expired=1", request.url));
}
