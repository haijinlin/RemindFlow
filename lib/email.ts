type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type EmailResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
}

export function reminderUrl(path = "/") {
  return new URL(path, appBaseUrl()).toString();
}

export function reminderRecipientEmail() {
  return (
    process.env.REMIND_FLOW_NOTIFICATION_EMAIL?.trim() ||
    process.env.REMINDFLOW_NOTIFICATION_EMAIL?.trim() ||
    process.env.NOTIFICATION_EMAIL?.trim() ||
    null
  );
}

function fromAddress() {
  return process.env.EMAIL_FROM || "RemindFlow <notifications@remindflow.local>";
}

export function emailNotificationsConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && reminderRecipientEmail());
}

export async function sendEmail({ to, subject, text, html }: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipient = to.trim();

  if (!apiKey || !recipient) {
    return {
      status: "skipped",
      reason: !apiKey ? "RESEND_API_KEY is not configured." : "Recipient email is missing.",
    };
  }

  if (!isEmailAddress(recipient) && !isNamedEmailAddress(recipient)) {
    return {
      status: "failed",
      reason:
        "Recipient email is invalid. Set REMIND_FLOW_NOTIFICATION_EMAIL to a plain email address like name@example.com.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [recipient],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        status: "failed",
        reason: `Resend returned ${response.status}: ${detail.slice(0, 240)}`,
      };
    }

    return { status: "sent" };
  } catch {
    return { status: "failed", reason: "Email request failed." };
  }
}

function isEmailAddress(value: string) {
  return /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(value);
}

function isNamedEmailAddress(value: string) {
  return /^.+\s<[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>$/.test(value);
}
