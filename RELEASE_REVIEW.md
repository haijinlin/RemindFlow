# RemindFlow release review

Last reviewed: 4 August 2026

## Classification

- Recommended status: private production / case study only.
- Public demo: not approved against the production database.
- Portfolio screenshots: synthetic data only.

## Privacy and access

- All user-interface routes require the private RemindFlow session.
- Every database-changing Server Action independently verifies the session.
- Password and session comparisons avoid early-exit string matching.
- The scheduled-email endpoint fails closed without `CRON_SECRET` and rejects an invalid bearer token.
- Local screenshot mode uses synthetic reminders and blocks writes.
- Daily emails may contain reminder titles, amounts, stores, contacts, and due dates; use only a protected recipient inbox.

## Release checks

1. Run `npm run build`.
2. Confirm an anonymous request redirects to `/login`.
3. Confirm the correct password opens the dashboard and a wrong password is rejected.
4. Confirm the cron endpoint returns `401` without the bearer token.
5. Test create, edit, complete, reopen, wait, and delete using a disposable reminder.
6. Send a test email and check the intended masked recipient.
7. Confirm portfolio screenshots contain only synthetic data.

