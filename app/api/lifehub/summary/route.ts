import { addDays, endOfDay, startOfDay } from "date-fns";
import { ReminderPriority, ReminderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasValidLifeHubSummaryRequest, lifeHubSummaryIsConfigured } from "@/lib/lifehub-summary-auth";

export const dynamic = "force-dynamic";

const activeStatuses = [ReminderStatus.PENDING, ReminderStatus.WAITING];
const priorityMap = {
  [ReminderPriority.LOW]: "low",
  [ReminderPriority.MEDIUM]: "medium",
  [ReminderPriority.HIGH]: "high",
} as const;

export async function GET(request: Request) {
  if (!lifeHubSummaryIsConfigured()) {
    return NextResponse.json({ error: "LifeHub summary access is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!(await hasValidLifeHubSummaryRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const horizon = endOfDay(addDays(now, 14));
  const where = { status: { in: activeStatuses } };
  const [overdue, today, upcoming, reminders] = await Promise.all([
    prisma.reminder.count({ where: { ...where, dueDate: { lt: todayStart } } }),
    prisma.reminder.count({ where: { ...where, dueDate: { gte: todayStart, lte: todayEnd } } }),
    prisma.reminder.count({ where: { ...where, dueDate: { gt: todayEnd, lte: horizon } } }),
    prisma.reminder.findMany({
      where: { ...where, dueDate: { lte: horizon } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 8,
      select: { id: true, title: true, dueDate: true, priority: true },
    }),
  ]);

  return NextResponse.json({
    module: "remindflow",
    updatedAt: new Date().toISOString(),
    counts: { overdue, today, upcoming, needsAttention: overdue + today },
    actions: reminders.map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      dueAt: reminder.dueDate.toISOString(),
      priority: priorityMap[reminder.priority],
      href: "/?view=list",
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
