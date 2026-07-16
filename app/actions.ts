"use server";

import { ReminderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendDailyReminderEmail } from "@/lib/daily-email";
import { prisma } from "@/lib/prisma";

function blockScreenshotWrites() {
  if (process.env.SCREENSHOT_MODE === "true") {
    throw new Error("Changes are disabled in screenshot mode.");
  }
}
import { parseDateOnly, reminderSchema } from "@/lib/reminders";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectTarget(formData?: FormData) {
  if (!formData) return "/";

  const value = getString(formData, "returnTo");
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  return value;
}

function withError(target: string, error: string) {
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}error=${error}`;
}

function parseReminderForm(formData: FormData, status: "PENDING" | "WAITING" | ReminderStatus) {
  return reminderSchema.parse({
    title: getString(formData, "title"),
    description: getString(formData, "description") || null,
    type: getString(formData, "type"),
    priority: getString(formData, "priority"),
    status,
    startDate: parseDateOnly(getString(formData, "startDate")),
    dueDate: parseDateOnly(getString(formData, "dueDate")),
    remindBeforeDays: formData.getAll("remindBeforeDays"),
    amount: getString(formData, "amount") || null,
    targetPrice: getString(formData, "targetPrice") || null,
    currency: getString(formData, "currency") || "AUD",
    storeName: getString(formData, "storeName") || null,
    url: getString(formData, "url") || null,
    contactName: getString(formData, "contactName") || null,
    contactInfo: getString(formData, "contactInfo") || null,
    notes: getString(formData, "notes") || null,
    completionNote: getString(formData, "completionNote") || null,
    repeatFrequency: getString(formData, "repeatFrequency") || "NONE",
  });
}

export async function createReminder(formData: FormData) {
  blockScreenshotWrites();
  const returnTo = redirectTarget(formData);

  try {
    const parsed = parseReminderForm(formData, "PENDING");
    await prisma.reminder.create({
      data: {
        ...parsed,
        completedAt: null,
      },
    });
  } catch {
    redirect(withError(returnTo, "invalid-reminder"));
  }

  revalidatePath("/");
  redirect(returnTo);
}

export async function updateReminder(id: string, formData: FormData) {
  blockScreenshotWrites();
  const returnTo = redirectTarget(formData);

  try {
    const existingReminder = await prisma.reminder.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    const parsed = parseReminderForm(formData, existingReminder.status);
    await prisma.reminder.update({
      where: { id },
      data: {
        ...parsed,
      },
    });
  } catch {
    redirect(withError(returnTo, "invalid-reminder"));
  }

  revalidatePath("/");
  redirect(returnTo.replace(/[?&]edit=[^&]+/, ""));
}

export async function deleteReminder(id: string, formData?: FormData) {
  blockScreenshotWrites();
  await prisma.reminder.delete({ where: { id } });
  revalidatePath("/");
  redirect(redirectTarget(formData));
}

export async function setReminderStatus(id: string, status: ReminderStatus, formData?: FormData) {
  blockScreenshotWrites();
  const completionNote = formData ? getString(formData, "completionNote").trim() || null : null;

  await prisma.$transaction(async (tx) => {
    const existingReminder = await tx.reminder.findUniqueOrThrow({ where: { id } });
    const wasAlreadyDone = existingReminder.status === "DONE";

    await tx.reminder.update({
      where: { id },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
        completionNote: status === "DONE" ? completionNote : null,
        snoozedUntil: null,
      },
    });

    if (status === "DONE" && !wasAlreadyDone && existingReminder.repeatFrequency !== "NONE") {
      await tx.reminder.create({
        data: {
          title: existingReminder.title,
          description: existingReminder.description,
          type: existingReminder.type,
          priority: existingReminder.priority,
          status: "PENDING",
          startDate: existingReminder.startDate
            ? nextRepeatDate(existingReminder.startDate, existingReminder.repeatFrequency)
            : null,
          dueDate: nextRepeatDate(existingReminder.dueDate, existingReminder.repeatFrequency),
          remindBeforeDays: existingReminder.remindBeforeDays,
          amount: existingReminder.amount,
          targetPrice: existingReminder.targetPrice,
          currency: existingReminder.currency,
          storeName: existingReminder.storeName,
          url: existingReminder.url,
          contactName: existingReminder.contactName,
          contactInfo: existingReminder.contactInfo,
          notes: existingReminder.notes,
          repeatFrequency: existingReminder.repeatFrequency,
          sourceApp: existingReminder.sourceApp,
          sourceId: existingReminder.sourceId,
          linkedEntityType: existingReminder.linkedEntityType,
          linkedEntityId: existingReminder.linkedEntityId,
        },
      });
    }
  });

  revalidatePath("/");
  redirect(redirectTarget(formData));
}

function nextRepeatDate(date: Date, frequency: string) {
  const nextDate = new Date(date);

  if (frequency === "WEEKLY") {
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate;
  }

  if (frequency === "MONTHLY") {
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }

  if (frequency === "YEARLY") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    return nextDate;
  }

  return nextDate;
}

export async function sendTestReminderEmail() {
  blockScreenshotWrites();
  const result = await sendDailyReminderEmail();
  const params = new URLSearchParams({
    emailStatus: result.status,
  });

  if ("reason" in result) {
    params.set("reason", result.reason);
  }

  redirect(`/settings?${params.toString()}`);
}
