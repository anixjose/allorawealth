-- AlterTable
ALTER TABLE "repayments" ADD COLUMN     "recorded_by" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "employee_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_number_key" ON "users"("employee_number");

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS employee_number_seq;
