import type { Reminder } from "@prisma/client";
import { ReminderPriority, ReminderStatus, ReminderType } from "@prisma/client";
import Image from "next/image";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Settings,
  LogOut,
  Tag,
  Trash2,
} from "lucide-react";
import {
  createReminder,
  deleteReminder,
  setReminderStatus,
  updateReminder,
} from "@/app/actions";
import { logout } from "@/app/login/actions";
import { prisma } from "@/lib/prisma";
import { getScreenshotReminders } from "@/lib/screenshot-reminders";
import {
  localDateInputValue,
  remindBeforeDayOptions,
  remindBeforeLabel,
  reminderPriorityLabels,
  repeatFrequencies,
  repeatFrequencyLabels,
  reminderStatusLabels,
  reminderTypeLabels,
  reminderTypes,
} from "@/lib/reminders";

export const dynamic = "force-dynamic";

type PageSearchParams = {
  view?: string;
  type?: string;
  status?: string;
  q?: string;
  month?: string;
  edit?: string;
  error?: string;
  templateTitle?: string;
  templateType?: string;
  templatePriority?: string;
  templateDueOffset?: string;
};

const activeStatuses = new Set<ReminderStatus>([
  ReminderStatus.PENDING,
]);

const expiringSoonTypes = new Set<ReminderType>([
  ReminderType.DEAL,
  ReminderType.WATCHLIST,
  ReminderType.SUBSCRIPTION,
  ReminderType.GENERAL,
]);

const typeIcon: Record<ReminderType, typeof AlarmClock> = {
  SUBSCRIPTION: RotateCcw,
  BILL: CircleDollarSign,
  APPOINTMENT: CalendarDays,
  FOLLOW_UP: Clock3,
  DEAL: Tag,
  WATCHLIST: Tag,
  CONTACT: Phone,
  CALL: Phone,
  EMAIL: Mail,
  GENERAL: AlarmClock,
};

const typeClasses: Record<ReminderType, string> = {
  SUBSCRIPTION: "border-blue-200 bg-blue-50 text-blue-700",
  BILL: "border-emerald-200 bg-emerald-50 text-emerald-700",
  APPOINTMENT: "border-violet-200 bg-violet-50 text-violet-700",
  FOLLOW_UP: "border-amber-200 bg-amber-50 text-amber-800",
  DEAL: "border-rose-200 bg-rose-50 text-rose-700",
  WATCHLIST: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  CONTACT: "border-cyan-200 bg-cyan-50 text-cyan-700",
  CALL: "border-cyan-200 bg-cyan-50 text-cyan-700",
  EMAIL: "border-indigo-200 bg-indigo-50 text-indigo-700",
  GENERAL: "border-slate-200 bg-slate-50 text-slate-700",
};

const priorityClasses: Record<ReminderPriority, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-slate-700",
  HIGH: "text-red-700",
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const view =
    params?.view === "list" || params?.view === "calendar" ? params.view : "dashboard";
  const typeFilter = params?.type ?? "all";
  const statusFilter = params?.status ?? "all";
  const query = params?.q?.trim() ?? "";
  const parsedMonth = params?.month ? new Date(`${params.month}-01T00:00:00`) : new Date();
  const month = isValid(parsedMonth) ? parsedMonth : new Date();
  const returnTo = buildReturnTo({ view, typeFilter, statusFilter, query, month: params?.month });

  const reminders = process.env.SCREENSHOT_MODE === "true"
    ? getScreenshotReminders()
    : await prisma.reminder.findMany({
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { priority: "desc" }],
      });
  const editingReminder = params?.edit
    ? reminders.find((reminder) => reminder.id === params.edit)
    : null;

  const today = startOfDay(new Date());
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const soonEnd = addDays(today, 7);
  const attentionEnd = addDays(today, 3);
  const staleWaitingCutoff = addDays(today, -7);
  const activeReminders = reminders.filter((reminder) => activeStatuses.has(reminder.status));
  const staleWaitingReminders = reminders.filter(
    (reminder) =>
      reminder.status === ReminderStatus.WAITING && reminder.updatedAt <= staleWaitingCutoff,
  );
  const needsAttention = activeReminders.filter(
    (reminder) =>
      reminder.dueDate < today ||
      (reminder.priority === ReminderPriority.HIGH &&
        reminder.dueDate >= today &&
        reminder.dueDate <= attentionEnd) ||
      (reminder.type === ReminderType.BILL &&
        reminder.dueDate >= today &&
        reminder.dueDate <= attentionEnd) ||
      (reminder.type === ReminderType.SUBSCRIPTION &&
        reminder.dueDate >= today &&
        reminder.dueDate <= soonEnd) ||
      (reminder.type === ReminderType.WATCHLIST && reminder.dueDate <= today),
  );
  const attentionItems = uniqueReminders([...needsAttention, ...staleWaitingReminders]);
  const visibleReminders = reminders.filter((reminder) => {
    const matchesType = typeFilter === "all" || reminder.type === typeFilter;
    const matchesStatus = statusFilter === "all" || reminder.status === statusFilter;
    const matchesQuery = !query || reminderMatchesQuery(reminder, query);
    return matchesType && matchesStatus && matchesQuery;
  });

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/icons/icon.svg"
                alt="RemindFlow"
                width={40}
                height={40}
                priority
                className="h-10 w-10 rounded-md"
              />
              <div>
                <h1 className="text-2xl font-semibold text-slate-950">RemindFlow</h1>
                <p className="text-sm text-slate-500">
                  Smart reminders for life admin, subscriptions, bills, appointments, and follow-ups.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <nav className="inline-flex h-10 rounded-md border border-slate-200 bg-slate-50 p-1">
                {[
                  { value: "dashboard", label: "Dashboard" },
                  { value: "list", label: "List" },
                  { value: "calendar", label: "Calendar" },
                ].map((item) => (
                  <a
                    key={item.value}
                    href={`/?view=${item.value}`}
                    className={`inline-flex items-center rounded px-3 text-sm font-medium ${
                      view === item.value
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <a
                href="/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                title="Notification settings"
              >
                <Settings className="h-4 w-4" />
              </a>
              <form action={logout}>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </header>

        {params?.error === "invalid-reminder" ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Check the reminder details. Title, due date, valid URL, and amount fields need valid values.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 space-y-5">
            {view === "dashboard" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="xl:col-span-2">
                  <DashboardSection
                    title="Needs Attention"
                    items={attentionItems}
                    returnTo={returnTo}
                    urgent
                  />
                </div>
                <DashboardSection
                  title="Today"
                  items={activeReminders.filter((reminder) => isSameDay(reminder.dueDate, today))}
                  returnTo={returnTo}
                />
                <DashboardSection
                  title="Overdue"
                  items={activeReminders.filter((reminder) => reminder.dueDate < today)}
                  returnTo={returnTo}
                  urgent
                />
                <DashboardSection
                  title="This Week"
                  items={activeReminders.filter(
                    (reminder) => reminder.dueDate >= today && reminder.dueDate <= weekEnd,
                  )}
                  returnTo={returnTo}
                />
                <DashboardSection
                  title="Expiring Soon"
                  items={activeReminders.filter(
                    (reminder) =>
                      expiringSoonTypes.has(reminder.type) &&
                      reminder.dueDate >= today &&
                      reminder.dueDate <= soonEnd,
                  )}
                  returnTo={returnTo}
                />
                <DashboardSection
                  title="Bills Due"
                  items={activeReminders.filter((reminder) => reminder.type === ReminderType.BILL)}
                  returnTo={returnTo}
                />
                <DashboardSection
                  title="Subscriptions"
                  items={activeReminders.filter(
                    (reminder) => reminder.type === ReminderType.SUBSCRIPTION,
                  )}
                  returnTo={returnTo}
                />
                <DashboardSection
                  title="Watchlist"
                  items={activeReminders.filter(
                    (reminder) => reminder.type === ReminderType.WATCHLIST,
                  )}
                  returnTo={returnTo}
                />
              </div>
            ) : null}

            {view === "list" ? (
              <ListView
                reminders={visibleReminders}
                typeFilter={typeFilter}
                statusFilter={statusFilter}
                query={query}
                returnTo={returnTo}
              />
            ) : null}

            {view === "calendar" ? (
              <CalendarView reminders={visibleReminders} month={month} returnTo={returnTo} />
            ) : null}
          </section>

          <aside className="space-y-4">
            <ReminderForm
              reminder={editingReminder}
              returnTo={returnTo}
              templateTitle={params?.templateTitle}
              templateType={params?.templateType}
              templatePriority={params?.templatePriority}
              templateDueOffset={params?.templateDueOffset}
            />
            <div className="rounded-md border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <div className="font-semibold text-slate-950">Future integration</div>
              <p className="mt-2 text-slate-500">
                Reminders keep source app and linked entity fields, so CoCare, HomeStock, Job Tracker,
                and Life Dashboard can connect later without merging codebases.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ReminderForm({
  reminder,
  returnTo,
  templateTitle,
  templateType,
  templatePriority,
  templateDueOffset,
}: {
  reminder?: Reminder | null;
  returnTo: string;
  templateTitle?: string;
  templateType?: string;
  templatePriority?: string;
  templateDueOffset?: string;
}) {
  const action = reminder ? updateReminder.bind(null, reminder.id) : createReminder;
  const defaultType = isReminderType(templateType) ? templateType : ReminderType.GENERAL;
  const defaultPriority = isReminderPriority(templatePriority)
    ? templatePriority
    : ReminderPriority.MEDIUM;
  const defaultDueDate = reminder?.dueDate ?? addDays(new Date(), Number(templateDueOffset || "0"));

  return (
    <form action={action} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">
          {reminder ? "Edit reminder" : "Quick capture"}
        </h2>
        {reminder ? (
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-slate-950">
            New
          </a>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        {!reminder ? (
          <div className="grid grid-cols-2 gap-2">
            {[
              { title: "Cancel subscription", type: ReminderType.SUBSCRIPTION, priority: ReminderPriority.HIGH },
              { title: "Pay bill", type: ReminderType.BILL, priority: ReminderPriority.HIGH },
              { title: "Contact someone", type: ReminderType.CONTACT, priority: ReminderPriority.MEDIUM },
              { title: "Use coupon or deal", type: ReminderType.DEAL, priority: ReminderPriority.MEDIUM },
              { title: "Watch for deal", type: ReminderType.WATCHLIST, priority: ReminderPriority.LOW, dueOffset: 7 },
            ].map((template) => (
              <a
                key={template.title}
                href={`/?templateTitle=${encodeURIComponent(template.title)}&templateType=${template.type}&templatePriority=${template.priority}${"dueOffset" in template ? `&templateDueOffset=${template.dueOffset}` : ""}`}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {template.title}
              </a>
            ))}
          </div>
        ) : null}
        <input
          name="title"
          defaultValue={reminder?.title ?? templateTitle ?? ""}
          placeholder="What needs attention?"
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            name="type"
            defaultValue={reminder?.type ?? defaultType}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            {reminderTypes.map((type) => (
              <option key={type} value={type}>
                {reminderTypeLabels[type]}
              </option>
            ))}
          </select>
          <select
            name="priority"
            defaultValue={reminder?.priority ?? defaultPriority}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            {Object.values(ReminderPriority).map((priority) => (
              <option key={priority} value={priority}>
                {reminderPriorityLabels[priority]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-slate-500">
            Start optional
            <input
              name="startDate"
              type="date"
              defaultValue={localDateInputValue(reminder?.startDate)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Due
            <input
              name="dueDate"
              type="date"
              defaultValue={localDateInputValue(defaultDueDate)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
              required
            />
          </label>
        </div>
        <fieldset className="rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-xs font-semibold text-slate-500">Remind me</legend>
          <div className="grid grid-cols-2 gap-2">
            {remindBeforeDayOptions.map((days) => {
              const selected = reminder?.remindBeforeDays?.includes(days) ?? days === 0;

              return (
                <label key={days} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    name="remindBeforeDays"
                    type="checkbox"
                    value={days}
                    defaultChecked={selected}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {remindBeforeLabel(days)}
                </label>
              );
            })}
          </div>
        </fieldset>
        {reminder ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Current status:{" "}
            <span className="font-medium text-slate-950">
              {reminderStatusLabels[reminder.status]}
            </span>
          </div>
        ) : null}
        <details className="rounded-md border border-slate-200 p-3" open={Boolean(reminder)}>
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Details
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={reminder?.amount?.toString() ?? ""}
                placeholder="Amount"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm"
              />
              <input
                name="targetPrice"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={reminder?.targetPrice?.toString() ?? ""}
                placeholder="Target price"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm"
              />
            </div>
            <input
              name="currency"
              defaultValue={reminder?.currency ?? "AUD"}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm uppercase"
              maxLength={3}
            />
            <input
              name="storeName"
              defaultValue={reminder?.storeName ?? ""}
              placeholder="Store or source"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
            <input
              name="url"
              type="url"
              defaultValue={reminder?.url ?? ""}
              placeholder="URL"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="contactName"
                defaultValue={reminder?.contactName ?? ""}
                placeholder="Contact name"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm"
              />
              <input
                name="contactInfo"
                defaultValue={reminder?.contactInfo ?? ""}
                placeholder="Contact info"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm"
              />
            </div>
            <textarea
              name="notes"
              rows={4}
              defaultValue={reminder?.notes ?? ""}
              placeholder="Notes"
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="repeatFrequency"
              defaultValue={reminder?.repeatFrequency ?? "NONE"}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {repeatFrequencies.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {repeatFrequencyLabels[frequency]}
                </option>
              ))}
            </select>
            {reminder?.completionNote ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium text-slate-950">Completion note:</span>{" "}
                {reminder.completionNote}
              </div>
            ) : null}
          </div>
        </details>
        <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" />
          {reminder ? "Save reminder" : "Add reminder"}
        </button>
      </div>
    </form>
  );
}

function ListView({
  reminders,
  typeFilter,
  statusFilter,
  query,
  returnTo,
}: {
  reminders: Reminder[];
  typeFilter: string;
  statusFilter: string;
  query: string;
  returnTo: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">All reminders</h2>
          <p className="mt-1 text-sm text-slate-500">{reminders.length} shown</p>
        </div>
        <form action="/" className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
          <input type="hidden" name="view" value="list" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search reminders"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          />
          <select name="type" defaultValue={typeFilter} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option value="all">All types</option>
            {reminderTypes.map((type) => (
              <option key={type} value={type}>
                {reminderTypeLabels[type]}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={statusFilter} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option value="all">All statuses</option>
            {[ReminderStatus.PENDING, ReminderStatus.WAITING, ReminderStatus.DONE].map((status) => (
              <option key={status} value={status}>
                {reminderStatusLabels[status]}
              </option>
            ))}
          </select>
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
            Apply
          </button>
        </form>
      </div>
      <div className="mt-4 space-y-3">
        {reminders.map((reminder) => (
          <ReminderRow key={reminder.id} reminder={reminder} returnTo={returnTo} />
        ))}
        {reminders.length === 0 ? <EmptyState label="No reminders match this view." /> : null}
      </div>
    </div>
  );
}

function DashboardSection({
  title,
  items,
  returnTo,
  urgent = false,
}: {
  title: string;
  items: Reminder[];
  returnTo: string;
  urgent?: boolean;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <span className={`text-sm font-semibold ${urgent && items.length ? "text-red-700" : "text-slate-500"}`}>
          {items.length}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {items.slice(0, 5).map((reminder) => (
          <ReminderRow key={reminder.id} reminder={reminder} returnTo={returnTo} compact />
        ))}
        {items.length === 0 ? <EmptyState label="Nothing here." /> : null}
      </div>
    </section>
  );
}

function ReminderRow({
  reminder,
  returnTo,
  compact = false,
}: {
  reminder: Reminder;
  returnTo: string;
  compact?: boolean;
}) {
  const Icon = typeIcon[reminder.type];

  return (
    <article className="rounded-md border border-slate-200 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium ${typeClasses[reminder.type]}`}>
              <Icon className="h-3.5 w-3.5" />
              {reminderTypeLabels[reminder.type]}
            </span>
            <span className={`text-xs font-semibold ${priorityClasses[reminder.priority]}`}>
              {reminderPriorityLabels[reminder.priority]}
            </span>
            <span className="text-xs text-slate-400">{reminderStatusLabels[reminder.status]}</span>
          </div>
          <h3 className="mt-2 font-semibold text-slate-950">{reminder.title}</h3>
          <div className="mt-1 text-slate-500">
            {reminder.type === ReminderType.WATCHLIST ? "Next check" : "Due"}{" "}
            {format(reminder.dueDate, "d MMM yyyy")}
          </div>
          {!compact ? (
            <div className="mt-1 text-xs text-slate-400">
              Reminds {reminder.remindBeforeDays.map(remindBeforeLabel).join(", ")}
            </div>
          ) : null}
          {!compact && reminder.notes ? <p className="mt-2 text-slate-700">{reminder.notes}</p> : null}
          {!compact && (reminder.amount || reminder.targetPrice || reminder.storeName || reminder.contactName || reminder.url) ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {reminder.amount ? (
                <span>
                  {reminder.currency} {reminder.amount.toString()}
                </span>
              ) : null}
              {reminder.targetPrice ? (
                <span>
                  Target {reminder.currency} {reminder.targetPrice.toString()}
                </span>
              ) : null}
              {reminder.storeName ? <span>{reminder.storeName}</span> : null}
              {reminder.contactName ? <span>{reminder.contactName}</span> : null}
              {reminder.url ? (
                <a href={reminder.url} className="inline-flex items-center gap-1 text-blue-700" target="_blank">
                  Link <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          ) : null}
          {!compact && reminder.repeatFrequency !== "NONE" ? (
            <div className="mt-2 text-xs font-medium text-slate-500">
              Repeats {repeatLabel(reminder.repeatFrequency)}
            </div>
          ) : null}
          {!compact && reminder.completionNote ? (
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
              <span className="font-medium text-slate-800">Done note:</span>{" "}
              {reminder.completionNote}
            </div>
          ) : null}
        </div>
        <a href={`/?edit=${reminder.id}`} className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
          Edit
        </a>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {reminder.status !== ReminderStatus.DONE ? (
          <form action={setReminderStatus.bind(null, reminder.id, ReminderStatus.DONE)}>
            <input type="hidden" name="returnTo" value={returnTo} />
            {!compact ? (
              <input
                name="completionNote"
                placeholder="Done note"
                className="mb-2 h-8 w-full rounded-md border border-emerald-200 px-2 text-xs text-slate-700"
              />
            ) : null}
            <button className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-md border border-emerald-200 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </button>
          </form>
        ) : (
          <form action={setReminderStatus.bind(null, reminder.id, ReminderStatus.PENDING)}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="h-9 w-full rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Reopen
            </button>
          </form>
        )}
        {reminder.status !== ReminderStatus.WAITING ? (
          <form action={setReminderStatus.bind(null, reminder.id, ReminderStatus.WAITING)}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="h-9 w-full rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Waiting
            </button>
          </form>
        ) : (
          <form action={setReminderStatus.bind(null, reminder.id, ReminderStatus.PENDING)}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="h-9 w-full rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Resume
            </button>
          </form>
        )}
        <form action={deleteReminder.bind(null, reminder.id)}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <button className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-md border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </form>
      </div>
    </article>
  );
}

function CalendarView({
  reminders,
  month,
  returnTo,
}: {
  reminders: Reminder[];
  month: Date;
  returnTo: string;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-950">{format(monthStart, "MMMM yyyy")}</h2>
        <form action="/" className="flex gap-2">
          <input type="hidden" name="view" value="calendar" />
          <input name="month" type="month" defaultValue={format(monthStart, "yyyy-MM")} className="h-10 rounded-md border border-slate-200 px-3 text-sm" />
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
            Go
          </button>
        </form>
      </div>
      <div className="mt-4 hidden grid-cols-7 border-l border-t border-slate-200 text-xs font-medium text-slate-500 sm:grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="border-b border-r border-slate-200 bg-slate-50 px-2 py-2">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dayItems = reminders.filter((reminder) => occursOnCalendarDay(reminder, day));

          return (
            <div
              key={day.toISOString()}
              className={`min-h-28 border-b border-r border-slate-200 p-2 ${
                isSameMonth(day, monthStart) ? "bg-white" : "bg-slate-50 text-slate-400"
              }`}
            >
              <div className="font-semibold">{format(day, "d")}</div>
              <div className="mt-2 space-y-1">
                {dayItems.slice(0, 3).map((reminder) => (
                  <a
                    key={reminder.id}
                    href={`/?edit=${reminder.id}`}
                    className={`block truncate rounded border px-1.5 py-1 ${typeClasses[reminder.type]}`}
                    title={reminder.title}
                  >
                    {reminder.title}
                  </a>
                ))}
                {dayItems.length > 3 ? (
                  <div className="text-[11px] text-slate-400">+{dayItems.length - 3} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-3 sm:hidden">
        {monthAgendaItems(reminders, monthStart, monthEnd).map((item) => (
          <div key={`${item.day.toISOString()}-${item.reminder.id}`} className="rounded-md border border-slate-200 p-3 text-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">
              {format(item.day, "EEE d MMM")}
            </div>
            <a href={`/?edit=${item.reminder.id}`} className="mt-1 block font-semibold text-slate-950">
              {item.reminder.title}
            </a>
            <div className="mt-1 text-xs text-slate-500">
              {reminderTypeLabels[item.reminder.type]} - due {format(item.reminder.dueDate, "d MMM")}
            </div>
          </div>
        ))}
        {monthAgendaItems(reminders, monthStart, monthEnd).length === 0 ? (
          <EmptyState label="No reminders this month." />
        ) : null}
      </div>
      <input type="hidden" value={returnTo} readOnly />
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
      {label}
    </div>
  );
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function occursOnCalendarDay(reminder: Reminder, day: Date) {
  if (
    reminder.type === ReminderType.DEAL &&
    reminder.startDate &&
    reminder.startDate <= day &&
    reminder.dueDate >= day
  ) {
    return true;
  }

  return isSameDay(reminder.dueDate, day);
}

function buildReturnTo({
  view,
  typeFilter,
  statusFilter,
  query,
  month,
}: {
  view: string;
  typeFilter: string;
  statusFilter: string;
  query?: string;
  month?: string;
}) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (query) params.set("q", query);
  if (typeFilter !== "all") params.set("type", typeFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (month) params.set("month", month);
  return `/?${params.toString()}`;
}

function reminderMatchesQuery(reminder: Reminder, query: string) {
  const value = query.toLowerCase();
  return [
    reminder.title,
    reminder.notes,
    reminder.contactName,
    reminder.contactInfo,
    reminder.storeName,
    reminder.url,
    reminder.completionNote,
  ]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(value));
}

function uniqueReminders(reminders: Reminder[]) {
  return Array.from(new Map(reminders.map((reminder) => [reminder.id, reminder])).values());
}

function monthAgendaItems(reminders: Reminder[], monthStart: Date, monthEnd: Date) {
  return reminders
    .flatMap((reminder) => {
      if (reminder.type === ReminderType.DEAL && reminder.startDate) {
        const startsAt = reminder.startDate > monthStart ? reminder.startDate : monthStart;
        const endsAt = reminder.dueDate < monthEnd ? reminder.dueDate : monthEnd;

        if (startsAt <= endsAt) {
          return eachDayOfInterval({ start: startsAt, end: endsAt }).map((day) => ({
            day,
            reminder,
          }));
        }
      }

      return reminder.dueDate >= monthStart && reminder.dueDate <= monthEnd
        ? [{ day: reminder.dueDate, reminder }]
        : [];
    })
    .sort((left, right) => left.day.getTime() - right.day.getTime());
}

function isReminderType(value: string | undefined): value is ReminderType {
  return Boolean(value && Object.values(ReminderType).includes(value as ReminderType));
}

function isReminderPriority(value: string | undefined): value is ReminderPriority {
  return Boolean(value && Object.values(ReminderPriority).includes(value as ReminderPriority));
}

function repeatLabel(frequency: string) {
  return frequency in repeatFrequencyLabels
    ? repeatFrequencyLabels[frequency as keyof typeof repeatFrequencyLabels].toLowerCase()
    : frequency.toLowerCase();
}
