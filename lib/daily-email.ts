import { Reminder, ReminderStatus, ReminderType } from "@prisma/client";
import { addDays, differenceInCalendarDays, endOfWeek, format } from "date-fns";
import { reminderUrl, sendEmail, reminderRecipientEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { reminderPriorityLabels, reminderStatusLabels, reminderTypeLabels } from "@/lib/reminders";

const activeStatuses = [
  ReminderStatus.PENDING,
];

export async function sendDailyReminderEmail() {
  const recipient = reminderRecipientEmail();
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const soonEnd = addDays(today, 7);
  const staleWaitingCutoff = addDays(today, -7);

  const reminders = await prisma.reminder.findMany({
    where: {
      AND: [
        {
          OR: [
            { status: { in: activeStatuses } },
            { status: ReminderStatus.WAITING, updatedAt: { lte: staleWaitingCutoff } },
          ],
        },
        {
          OR: [
            { dueDate: { lte: soonEnd } },
            {
              type: ReminderType.DEAL,
              startDate: { lte: today },
              dueDate: { gte: today },
            },
            { type: ReminderType.WATCHLIST, dueDate: { lte: today } },
          ],
        },
      ],
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
  });

  const remindersDueByRule = reminders.filter((reminder) => shouldEmailToday(reminder, today));
  const activeDeals = reminders.filter(
    (reminder) =>
      reminder.type === ReminderType.DEAL &&
      reminder.startDate &&
      reminder.startDate <= today &&
      reminder.dueDate >= today,
  );
  const emailItems = uniqueReminders([...remindersDueByRule, ...activeDeals]);

  const overdue = emailItems.filter((reminder) => reminder.dueDate < today);
  const todayItems = emailItems.filter((reminder) => isSameLocalDay(reminder.dueDate, today));
  const thisWeek = reminders.filter(
    (reminder) => reminder.dueDate >= today && reminder.dueDate <= weekEnd,
  );
  const bills = emailItems.filter((reminder) => reminder.type === ReminderType.BILL);
  const subscriptions = emailItems.filter((reminder) => reminder.type === ReminderType.SUBSCRIPTION);
  const watchlist = reminders.filter(
    (reminder) => reminder.type === ReminderType.WATCHLIST && reminder.dueDate <= today,
  );
  const deals = uniqueReminders([
    ...activeDeals,
    ...reminders.filter(
      (reminder) =>
        reminder.type === ReminderType.DEAL &&
        reminder.dueDate >= today &&
        reminder.dueDate <= soonEnd,
    ),
  ]);
  const appointments = emailItems.filter((reminder) => reminder.type === ReminderType.APPOINTMENT);
  const followUps = emailItems.filter((reminder) => reminder.type === ReminderType.FOLLOW_UP);
  const contact = emailItems.filter(
    (reminder) =>
      reminder.type === ReminderType.CONTACT ||
      reminder.type === ReminderType.CALL ||
      reminder.type === ReminderType.EMAIL,
  );
  const general = emailItems.filter((reminder) => reminder.type === ReminderType.GENERAL);
  const expiringDeals = deals.filter(
    (reminder) =>
      reminder.dueDate >= today &&
      reminder.dueDate <= soonEnd,
  );

  const subject = `RemindFlow daily summary: ${todayItems.length} today, ${overdue.length} overdue`;
  const text = [
    `RemindFlow daily summary for ${format(today, "d MMM yyyy")}`,
    "",
    section("Today", todayItems),
    section("Overdue", overdue),
    section("This Week", thisWeek),
    section("Bills Due", bills),
    section("Subscriptions", subscriptions),
    section("Watchlist", watchlist),
    section("Deals", deals),
    section("Appointments", appointments),
    section("Follow-ups", followUps),
    section("Contact", contact),
    section("General", general),
    "",
    `Open RemindFlow: ${reminderUrl("/")}`,
  ].join("\n");
  const html = dailyEmailHtml({
    today,
    overdue,
    todayItems,
    thisWeek,
    bills,
    subscriptions,
    watchlist,
    deals,
    appointments,
    followUps,
    contact,
    general,
  });

  const result = await sendEmail({
    to: recipient ?? "",
    subject,
    text,
    html,
  });

  return {
    ...result,
    counts: {
      today: todayItems.length,
      overdue: overdue.length,
      thisWeek: thisWeek.length,
      bills: bills.length,
      subscriptions: subscriptions.length,
      watchlist: watchlist.length,
      expiringDeals: expiringDeals.length,
    },
  };
}

function section(title: string, reminders: Reminder[]) {
  if (reminders.length === 0) return `${title}: none\n`;

  return [
    `${title}:`,
    ...reminders.slice(0, 10).map((reminder) => `- ${reminderLine(reminder)}`),
    reminders.length > 10 ? `- ...and ${reminders.length - 10} more` : null,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function reminderLine(reminder: Reminder) {
  const parts = [
    reminder.title,
    reminderTypeLabels[reminder.type],
    `due ${format(reminder.dueDate, "d MMM yyyy")}`,
    reminderPriorityLabels[reminder.priority],
    reminderStatusLabels[reminder.status],
    reminder.amount ? `${reminder.currency} ${reminder.amount.toString()}` : null,
    reminder.targetPrice ? `target ${reminder.currency} ${reminder.targetPrice.toString()}` : null,
    reminder.storeName,
    reminder.contactName,
    reminder.type === ReminderType.DEAL ? remainingDaysLabel(reminder, new Date()) : null,
    reminder.type === ReminderType.WATCHLIST ? "Check when convenient" : null,
  ];

  return parts.filter(Boolean).join(" | ");
}

function dailyEmailHtml({
  today,
  overdue,
  todayItems,
  thisWeek,
  bills,
  subscriptions,
  watchlist,
  deals,
  appointments,
  followUps,
  contact,
  general,
}: {
  today: Date;
  overdue: Reminder[];
  todayItems: Reminder[];
  thisWeek: Reminder[];
  bills: Reminder[];
  subscriptions: Reminder[];
  watchlist: Reminder[];
  deals: Reminder[];
  appointments: Reminder[];
  followUps: Reminder[];
  contact: Reminder[];
  general: Reminder[];
}) {
  const sections = [
    tableSection("Overdue", overdue, today, "#b91c1c"),
    tableSection("Today", todayItems, today, "#0f766e"),
    tableSection("This Week", thisWeek, today, "#334155"),
    tableSection("Bills", bills, today, "#047857"),
    tableSection("Subscriptions", subscriptions, today, "#1d4ed8"),
    tableSection("Watchlist", watchlist, today, "#a21caf"),
    tableSection("Deals", deals, today, "#be123c"),
    tableSection("Appointments", appointments, today, "#7c3aed"),
    tableSection("Follow-ups", followUps, today, "#b45309"),
    tableSection("Contact", contact, today, "#0369a1"),
    tableSection("General", general, today, "#475569"),
  ].join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;">
    <div style="max-width:760px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700;">RemindFlow</div>
        <h1 style="margin:6px 0 4px;font-size:24px;line-height:1.25;">Daily summary</h1>
        <p style="margin:0;color:#64748b;font-size:14px;">${escapeHtml(format(today, "d MMM yyyy"))}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
          ${metric("Today", todayItems.length)}
          ${metric("Overdue", overdue.length)}
          ${metric("This Week", thisWeek.length)}
          ${metric("Deals", deals.length)}
          ${metric("Watchlist", watchlist.length)}
        </div>
      </div>
      ${sections}
      <div style="text-align:center;margin:24px 0;">
        <a href="${escapeHtml(reminderUrl("/"))}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-size:14px;font-weight:700;">Open RemindFlow</a>
      </div>
    </div>
  </body>
</html>`;
}

function metric(label: string, count: number) {
  return `<div style="border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;min-width:92px;background:#f8fafc;">
    <div style="font-size:11px;color:#64748b;">${escapeHtml(label)}</div>
    <div style="font-size:20px;font-weight:700;color:#0f172a;">${count}</div>
  </div>`;
}

function tableSection(title: string, reminders: Reminder[], today: Date, color: string) {
  if (reminders.length === 0) return "";

  const rows = reminders
    .slice(0, 12)
    .map((reminder) => tableRow(reminder, today))
    .join("");
  const more =
    reminders.length > 12
      ? `<tr><td colspan="5" style="padding:10px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;">and ${reminders.length - 12} more</td></tr>`
      : "";

  return `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;margin-top:16px;overflow:hidden;">
    <div style="border-left:4px solid ${color};padding:14px 16px;">
      <h2 style="margin:0;font-size:16px;line-height:1.3;">${escapeHtml(title)}</h2>
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f8fafc;color:#475569;text-align:left;">
          <th style="padding:9px;border-top:1px solid #e2e8f0;">Reminder</th>
          <th style="padding:9px;border-top:1px solid #e2e8f0;">Type</th>
          <th style="padding:9px;border-top:1px solid #e2e8f0;">Due</th>
          <th style="padding:9px;border-top:1px solid #e2e8f0;">Priority</th>
          <th style="padding:9px;border-top:1px solid #e2e8f0;">Remaining</th>
        </tr>
      </thead>
      <tbody>${rows}${more}</tbody>
    </table>
  </div>`;
}

function tableRow(reminder: Reminder, today: Date) {
  const amount = reminder.amount ? ` - ${reminder.currency} ${reminder.amount.toString()}` : "";
  const targetPrice = reminder.targetPrice
    ? ` - target ${reminder.currency} ${reminder.targetPrice.toString()}`
    : "";
  const storeName = reminder.storeName ? ` - ${escapeHtml(reminder.storeName)}` : "";
  const contact = reminder.contactName ? ` - ${escapeHtml(reminder.contactName)}` : "";

  return `<tr>
    <td style="padding:10px;border-top:1px solid #e2e8f0;color:#0f172a;font-weight:700;">${escapeHtml(reminder.title)}<div style="font-weight:400;color:#64748b;margin-top:2px;">${escapeHtml(reminderStatusLabels[reminder.status])}${amount}${targetPrice}${storeName}${contact}</div></td>
    <td style="padding:10px;border-top:1px solid #e2e8f0;color:#475569;">${escapeHtml(reminderTypeLabels[reminder.type])}</td>
    <td style="padding:10px;border-top:1px solid #e2e8f0;color:#475569;">${escapeHtml(format(reminder.dueDate, "d MMM"))}</td>
    <td style="padding:10px;border-top:1px solid #e2e8f0;color:#475569;">${escapeHtml(reminderPriorityLabels[reminder.priority])}</td>
    <td style="padding:10px;border-top:1px solid #e2e8f0;color:#475569;">${escapeHtml(remainingDaysLabel(reminder, today))}</td>
  </tr>`;
}

function remainingDaysLabel(reminder: Reminder, today: Date) {
  const days = differenceInCalendarDays(startOfDay(reminder.dueDate), startOfDay(today));
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

function uniqueReminders(reminders: Reminder[]) {
  return Array.from(new Map(reminders.map((reminder) => [reminder.id, reminder])).values());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function shouldEmailToday(reminder: Reminder, today: Date) {
  if (
    reminder.type === ReminderType.DEAL &&
    reminder.startDate &&
    reminder.startDate <= today &&
    reminder.dueDate >= today
  ) {
    return true;
  }

  if (reminder.type === ReminderType.WATCHLIST) {
    return reminder.dueDate <= today;
  }

  if (reminder.dueDate < today) return true;

  const daysUntilDue = differenceInCalendarDays(startOfDay(reminder.dueDate), today);
  const configuredDays = reminder.remindBeforeDays.length > 0 ? reminder.remindBeforeDays : [0];

  return configuredDays.includes(daysUntilDue);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameLocalDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}
