import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "./session-config";

export { SESSION_COOKIE, sessionOptions, type SessionData } from "./session-config";

/** Session for the current request. Server components and actions only. */
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
