CREATE TYPE "ReminderType" AS ENUM ('SUBSCRIPTION', 'BILL', 'APPOINTMENT', 'FOLLOW_UP', 'DEAL', 'CALL', 'EMAIL', 'GENERAL');

CREATE TYPE "ReminderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'DONE', 'SNOOZED', 'CANCELLED', 'WAITING');

CREATE TYPE "ReminderSourceApp" AS ENUM ('REMINDFLOW', 'COCARE', 'HOMESTOCK', 'JOB_TRACKER', 'LIFE_DASHBOARD');

CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ReminderType" NOT NULL DEFAULT 'GENERAL',
    "priority" "ReminderPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "amount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "url" TEXT,
    "contactName" TEXT,
    "contactInfo" TEXT,
    "notes" TEXT,
    "sourceApp" "ReminderSourceApp" NOT NULL DEFAULT 'REMINDFLOW',
    "sourceId" TEXT,
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Reminder_dueDate_idx" ON "Reminder"("dueDate");

CREATE INDEX "Reminder_status_idx" ON "Reminder"("status");

CREATE INDEX "Reminder_type_idx" ON "Reminder"("type");

CREATE INDEX "Reminder_sourceApp_sourceId_idx" ON "Reminder"("sourceApp", "sourceId");

CREATE INDEX "Reminder_linkedEntityType_linkedEntityId_idx" ON "Reminder"("linkedEntityType", "linkedEntityId");
