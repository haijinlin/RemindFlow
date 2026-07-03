"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  authPassword,
  isAuthConfigured,
  sessionCookieName,
  sessionToken,
} from "@/lib/auth";

function safeRedirect(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}

export async function login(formData: FormData) {
  const from = safeRedirect(formData.get("from"));
  const password = formData.get("password");

  if (!isAuthConfigured()) {
    redirect("/login?error=config");
  }

  if (typeof password !== "string" || password !== authPassword()) {
    redirect(`/login?error=invalid&from=${encodeURIComponent(from)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(from);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  redirect("/login");
}
