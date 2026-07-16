import type { Reminder } from "@prisma/client";
import {
  ReminderPriority,
  ReminderSourceApp,
  ReminderStatus,
  ReminderType,
} from "@prisma/client";

function day(offset: number, hour = 9) {
  const value = new Date();
  value.setHours(hour, 0, 0, 0);
  value.setDate(value.getDate() + offset);
  return value;
}

function reminder(
  id: string,
  title: string,
  type: ReminderType,
  dueOffset: number,
  priority: ReminderPriority = ReminderPriority.MEDIUM,
  extras: Partial<Reminder> = {},
): Reminder {
  return {
    id,
    title,
    description: null,
    type,
    priority,
    status: ReminderStatus.PENDING,
    startDate: null,
    dueDate: day(dueOffset),
    completedAt: null,
    snoozedUntil: null,
    remindBeforeDays: [0, 1, 3],
    amount: null,
    targetPrice: null,
    currency: "AUD",
    storeName: null,
    url: null,
    contactName: null,
    contactInfo: null,
    notes: null,
    completionNote: null,
    repeatFrequency: "NONE",
    sourceApp: ReminderSourceApp.REMINDFLOW,
    sourceId: null,
    linkedEntityType: null,
    linkedEntityId: null,
    createdAt: day(-14),
    updatedAt: day(-2),
    ...extras,
  };
}

export function getScreenshotReminders(): Reminder[] {
  return [
    reminder("demo-renew", "Renew home insurance", ReminderType.BILL, 1, ReminderPriority.HIGH, {
      amount: null,
      repeatFrequency: "YEARLY",
    }),
    reminder("demo-dentist", "Book annual dental check-up", ReminderType.APPOINTMENT, 3),
    reminder("demo-library", "Return library books", ReminderType.GENERAL, 0, ReminderPriority.HIGH),
    reminder("demo-streaming", "Review streaming subscription", ReminderType.SUBSCRIPTION, 6),
    reminder("demo-alex", "Follow up with Alex about project notes", ReminderType.FOLLOW_UP, 2),
    reminder("demo-coupon", "Use grocery rewards voucher", ReminderType.DEAL, 8, ReminderPriority.LOW, {
      startDate: day(1),
    }),
    reminder("demo-sale", "Check standing desk sale", ReminderType.WATCHLIST, 10, ReminderPriority.LOW),
    reminder("demo-car", "Schedule car service", ReminderType.GENERAL, 14),
    reminder("demo-call", "Call community centre", ReminderType.CALL, 4),
    reminder("demo-email", "Email sample documents", ReminderType.EMAIL, 5),
  ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}
