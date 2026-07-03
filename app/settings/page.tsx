import type { Metadata } from "next";
import { AlarmClock, ArrowLeft, Mail } from "lucide-react";
import { sendTestReminderEmail } from "@/app/actions";
import { emailNotificationsConfigured, reminderRecipientEmail } from "@/lib/email";

export const metadata: Metadata = {
  title: "Notification Settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    emailStatus?: string;
    reason?: string;
  }>;
}) {
  const params = await searchParams;
  const recipient = reminderRecipientEmail();
  const configured = emailNotificationsConfigured();

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                <AlarmClock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-950">Notification Settings</h1>
                <p className="text-sm text-slate-500">Daily email reminders for RemindFlow.</p>
              </div>
            </div>
            <a
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </a>
          </div>
        </header>

        {params?.emailStatus ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              params.emailStatus === "sent"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            Test email status: {params.emailStatus}
            {params.reason ? <div className="mt-1">{params.reason}</div> : null}
          </div>
        ) : null}

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Daily summary email</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sends Today, Overdue, This Week, Bills Due, Subscriptions, and Deals
                Expiring Soon.
              </p>
            </div>
            <span
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                configured
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {configured ? "Configured" : "Needs setup"}
            </span>
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">Recipient</div>
            <div className="mt-1 text-slate-950">{recipient ? maskEmail(recipient) : "Not set"}</div>
          </div>

          <form action={sendTestReminderEmail} className="mt-4">
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
              <Mail className="h-4 w-4" />
              Send test email
            </button>
          </form>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <h2 className="font-semibold text-slate-950">Environment variables</h2>
          <div className="mt-3 grid gap-2 text-slate-600">
            <code>RESEND_API_KEY</code>
            <code>EMAIL_FROM</code>
            <code>REMIND_FLOW_NOTIFICATION_EMAIL</code>
            <code>APP_BASE_URL</code>
            <code>CRON_SECRET</code>
          </div>
        </section>
      </div>
    </main>
  );
}

function maskEmail(email: string) {
  const at = email.indexOf("@");
  if (at <= 1) return email;

  return `${email.slice(0, 2)}***${email.slice(at)}`;
}
