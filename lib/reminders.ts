import { z } from "zod";

export const reminderTypes = [
  "SUBSCRIPTION",
  "BILL",
  "APPOINTMENT",
  "FOLLOW_UP",
  "DEAL",
  "WATCHLIST",
  "CONTACT",
  "GENERAL",
] as const;
export const allReminderTypes = [...reminderTypes, "CALL", "EMAIL"] as const;

export const reminderPriorities = ["LOW", "MEDIUM", "HIGH"] as const;
export const reminderStatuses = ["PENDING", "DONE", "SNOOZED", "CANCELLED", "WAITING"] as const;
export const remindBeforeDayOptions = [0, 1, 3, 7, 14, 30] as const;
export const repeatFrequencies = ["NONE", "WEEKLY", "MONTHLY", "YEARLY"] as const;

export const repeatFrequencyLabels: Record<(typeof repeatFrequencies)[number], string> = {
  NONE: "Does not repeat",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export const reminderTypeLabels: Record<(typeof allReminderTypes)[number], string> = {
  SUBSCRIPTION: "Subscription",
  BILL: "Bill",
  APPOINTMENT: "Appointment",
  FOLLOW_UP: "Follow-up",
  DEAL: "Deal",
  WATCHLIST: "Watchlist",
  CONTACT: "Contact",
  CALL: "Contact",
  EMAIL: "Contact",
  GENERAL: "General",
};

export const reminderPriorityLabels: Record<(typeof reminderPriorities)[number], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const reminderStatusLabels: Record<(typeof reminderStatuses)[number], string> = {
  PENDING: "Pending",
  DONE: "Done",
  SNOOZED: "Snoozed",
  CANCELLED: "Cancelled",
  WAITING: "Waiting",
};

const optionalText = z.string().trim().max(1000).optional().nullable();
const optionalShortText = z.string().trim().max(240).optional().nullable();

export const reminderSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: optionalText,
    type: z.enum(reminderTypes),
    priority: z.enum(reminderPriorities),
    status: z.enum(reminderStatuses),
    startDate: z.coerce.date().optional().nullable(),
    dueDate: z.coerce.date(),
    remindBeforeDays: z
      .array(z.coerce.number().int().min(0).max(365))
      .default([0])
      .transform((days) => {
        const uniqueDays = Array.from(new Set(days)).sort((left, right) => left - right);
        return uniqueDays.length > 0 ? uniqueDays : [0];
      }),
    amount: z.coerce.number().positive().optional().nullable(),
    targetPrice: z.coerce.number().positive().optional().nullable(),
    currency: z.string().trim().min(3).max(3).default("AUD"),
    storeName: optionalShortText,
    url: z.string().trim().url().optional().or(z.literal("")).nullable(),
    contactName: optionalShortText,
    contactInfo: optionalShortText,
    notes: optionalText,
    completionNote: optionalText,
    repeatFrequency: z.enum(repeatFrequencies).default("NONE"),
  })
  .refine((data) => !data.startDate || data.startDate <= data.dueDate, {
    message: "Start date must be before the due date.",
    path: ["startDate"],
  });

export function parseDateOnly(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

export function localDateInputValue(date: Date | null | undefined) {
  if (!date) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function remindBeforeLabel(days: number) {
  if (days === 0) return "On due date";
  if (days === 1) return "1 day before";
  return `${days} days before`;
}
