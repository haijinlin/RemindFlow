ALTER TABLE "Reminder" ADD COLUMN "targetPrice" DECIMAL(10,2);

ALTER TABLE "Reminder" ADD COLUMN "storeName" TEXT;

ALTER TABLE "Reminder" ADD COLUMN "completionNote" TEXT;

ALTER TABLE "Reminder" ADD COLUMN "repeatFrequency" TEXT NOT NULL DEFAULT 'NONE';
