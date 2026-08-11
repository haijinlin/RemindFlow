CREATE TABLE "ReminderAttachment" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReminderAttachment_reminderId_idx" ON "ReminderAttachment"("reminderId");

ALTER TABLE "ReminderAttachment" ADD CONSTRAINT "ReminderAttachment_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
