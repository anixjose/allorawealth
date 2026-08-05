-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_reference_type_reference_id_key" ON "wallet_transactions"("reference_type", "reference_id");

