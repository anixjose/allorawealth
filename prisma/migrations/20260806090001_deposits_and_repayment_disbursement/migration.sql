-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "repayments" ADD COLUMN     "disbursed_at" TIMESTAMP(3),
ADD COLUMN     "disbursed_by" TEXT,
ALTER COLUMN "status" SET DEFAULT 'RECEIVED';

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "deposit_number" TEXT NOT NULL,
    "investor_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "payment_reference" TEXT NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "wallet_transaction_id" TEXT,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "rejection_reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deposits_deposit_number_key" ON "deposits"("deposit_number");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_payment_reference_key" ON "deposits"("payment_reference");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_wallet_transaction_id_key" ON "deposits"("wallet_transaction_id");

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_disbursed_by_fkey" FOREIGN KEY ("disbursed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateSequence (reference-number sequence, not modeled in Prisma schema — see src/common/reference-number.ts)
CREATE SEQUENCE IF NOT EXISTS deposit_number_seq;
