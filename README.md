# RemindFlow

Smart life admin reminders for subscriptions, bills, appointments, follow-ups, deals, calls, emails, and general reminders.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to this app's own PostgreSQL database.
3. Run:

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run dev
```

Open `http://localhost:3001` if you run the dev server on port 3001.

## Install on Phone

RemindFlow includes a web app manifest and app icons, so it can be saved to your phone home screen.

- iPhone Safari: open the site, tap Share, then Add to Home Screen.
- Android Chrome: open the site, tap the menu, then Install app or Add to Home screen.

## Daily Email Reminders

RemindFlow can send a daily email summary with Today, Overdue, This Week, Bills Due, Subscriptions, and Deals Expiring Soon.

Each reminder can choose its own reminder timing:

- On due date
- 1 day before
- 3 days before
- 7 days before
- 14 days before
- 30 days before

Set these environment variables:

```txt
RESEND_API_KEY=
EMAIL_FROM=
REMIND_FLOW_NOTIFICATION_EMAIL=
APP_BASE_URL=
CRON_SECRET=
```

The email endpoint is:

```txt
/api/reminders/daily-email
```

You can also send a test email from:

```txt
/settings
```

If `CRON_SECRET` is set, call it with:

```txt
Authorization: Bearer <CRON_SECRET>
```

`vercel.json` schedules the email for `0 21 * * *` UTC, which is 7:00 AM in Sydney during AEST and 8:00 AM during AEDT.

## Login Protection

The RemindFlow UI is protected by a single personal password. Set:

```txt
REMINDFLOW_APP_PASSWORD=
AUTH_SECRET=
```

`AUTH_SECRET` should be a long random string. In local development, the app is open if these are not set. In production, they are required.

## Deploy Checklist

For Vercel deployment, set these environment variables in the Vercel project:

- `DATABASE_URL`
- `APP_BASE_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `REMIND_FLOW_NOTIFICATION_EMAIL`
- `CRON_SECRET`
- `REMINDFLOW_APP_PASSWORD`
- `AUTH_SECRET`

After deploy, set `APP_BASE_URL` to the production URL, for example `https://your-remindflow-domain.vercel.app`.

## Integration Design

RemindFlow stays independent from CoCare, HomeStock, Job Tracker, and Life Dashboard. Future integrations can create reminders through shared API/server actions using:

- `sourceApp`
- `sourceId`
- `linkedEntityType`
- `linkedEntityId`

That lets another app point to a reminder without merging databases or UI code.
