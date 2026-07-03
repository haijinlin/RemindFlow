import { NextResponse } from "next/server";
import { sendDailyReminderEmail } from "@/lib/daily-email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleDailyEmail(request);
}

export async function POST(request: Request) {
  return handleDailyEmail(request);
}

async function handleDailyEmail(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await sendDailyReminderEmail();
  const status = result.status === "failed" ? 500 : 200;

  return NextResponse.json(result, { status });
}
