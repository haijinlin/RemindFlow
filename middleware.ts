import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, sessionCookieName } from "@/lib/auth";

const publicFilePattern = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|webmanifest)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.NODE_ENV !== "production" && process.env.SCREENSHOT_MODE === "true") {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(sessionCookieName)?.value;

  if (await isValidSession(token)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", `${pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/api/reminders/daily-email" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/manifest.webmanifest" ||
    publicFilePattern.test(pathname)
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
