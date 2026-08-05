-- CreateEnum
CREATE TYPE "InvestorEntityType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "investors" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "business_name" TEXT,
ADD COLUMN     "entity_type" "InvestorEntityType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "registration_number" TEXT;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "permissions" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "investors_registration_number_key" ON "investors"("registration_number");

-- AddForeignKey
ALTER TABLE "investors" ADD CONSTRAINT "investors_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Sequence backing BUS-prefixed business reference numbers (see src/common/reference-number.ts)
CREATE SEQUENCE IF NOT EXISTS business_number_seq;
