-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "investment_opportunities" ALTER COLUMN "target_amount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "minimum_investment" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "investment_products" ALTER COLUMN "minimum_amount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "maximum_amount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "investments" ALTER COLUMN "principal_amount" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "investor_gl_reconciliation_items" ALTER COLUMN "gl_amount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "subledger_amount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "difference" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "investor_gl_reconciliations" ALTER COLUMN "gl_balance" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "subledger_balance" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "difference" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "journal_lines" ALTER COLUMN "debit" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "credit" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "repayment_schedules" ALTER COLUMN "principal_due" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "roi_due" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "total_due" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "repayments" ALTER COLUMN "principal_amount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "roi_amount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "other_amount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "total_amount" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "wallet_transactions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "wallets" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "withdrawals" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2);

