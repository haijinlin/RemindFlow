import "server-only";

import { cookies } from "next/headers";
import { isValidSession, sessionCookieName } from "@/lib/auth";

export async function requireAuthenticatedSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!(await isValidSession(token))) {
    throw new Error("Unauthorized");
  }
}

