-- CreateEnum
CREATE TYPE "ScheduleIIIGroup" AS ENUM ('SHARE_CAPITAL', 'RESERVES_AND_SURPLUS', 'LONG_TERM_BORROWINGS', 'OTHER_LONG_TERM_LIABILITIES', 'LONG_TERM_PROVISIONS', 'SHORT_TERM_BORROWINGS', 'TRADE_PAYABLES', 'OTHER_CURRENT_LIABILITIES', 'SHORT_TERM_PROVISIONS', 'FIXED_ASSETS', 'NON_CURRENT_INVESTMENTS', 'LONG_TERM_LOANS_AND_ADVANCES', 'OTHER_NON_CURRENT_ASSETS', 'CURRENT_INVESTMENTS', 'TRADE_RECEIVABLES', 'CASH_AND_CASH_EQUIVALENTS', 'SHORT_TERM_LOANS_AND_ADVANCES', 'OTHER_CURRENT_ASSETS', 'REVENUE_FROM_OPERATIONS', 'OTHER_INCOME', 'FINANCE_COSTS', 'OTHER_EXPENSES');

-- AlterTable: add nullable first so existing rows can be backfilled before the NOT NULL is enforced.
ALTER TABLE "accounts" ADD COLUMN     "schedule_iii_group" "ScheduleIIIGroup";

-- Backfill: classify the seeded chart of accounts per Schedule III (Division I).
UPDATE "accounts" SET "schedule_iii_group" = 'CASH_AND_CASH_EQUIVALENTS' WHERE "account_code" = '1010';
UPDATE "accounts" SET "schedule_iii_group" = 'OTHER_CURRENT_ASSETS' WHERE "account_code" IN ('1000', '1020', '1030', '1040');
UPDATE "accounts" SET "schedule_iii_group" = 'OTHER_CURRENT_LIABILITIES' WHERE "account_code" IN ('2000', '2010', '2020', '2030', '2040');
UPDATE "accounts" SET "schedule_iii_group" = 'SHARE_CAPITAL' WHERE "account_code" = '3010';
UPDATE "accounts" SET "schedule_iii_group" = 'RESERVES_AND_SURPLUS' WHERE "account_code" IN ('3000', '3020');
UPDATE "accounts" SET "schedule_iii_group" = 'REVENUE_FROM_OPERATIONS' WHERE "account_code" IN ('4010', '4020', '4030');
UPDATE "accounts" SET "schedule_iii_group" = 'OTHER_INCOME' WHERE "account_code" = '4000';
UPDATE "accounts" SET "schedule_iii_group" = 'OTHER_EXPENSES' WHERE "account_code" IN ('5000', '5010', '5020', '5030');

-- Fallback: any account created outside the seed (e.g. ad-hoc GL/Sub Ledger accounts already
-- created before this migration) gets a sensible default per its own account type.
UPDATE "accounts" SET "schedule_iii_group" = 'OTHER_CURRENT_ASSETS' WHERE "schedule_iii_group" IS NULL AND "account_type" = 'ASSET';
UPDATE "accounts" SET "schedule_iii_group" = 'OTHER_CURRENT_LIABILITIES' WHERE "schedule_iii_group" IS NULL AND "account_type" = 'LIABILITY';
UPDATE "accounts" SET "schedule_iii_group" = 'RESERVES_AND_SURPLUS' WHERE "schedule_iii_group" IS NULL AND "account_type" = 'EQUITY';
UPDATE "accounts" SET "schedule_iii_group" = 'OTHER_INCOME' WHERE "schedule_iii_group" IS NULL AND "account_type" = 'INCOME';
UPDATE "accounts" SET "schedule_iii_group" = 'OTHER_EXPENSES' WHERE "schedule_iii_group" IS NULL AND "account_type" = 'EXPENSE';

-- AlterTable: now that every row is classified, enforce it going forward.
ALTER TABLE "accounts" ALTER COLUMN "schedule_iii_group" SET NOT NULL;
