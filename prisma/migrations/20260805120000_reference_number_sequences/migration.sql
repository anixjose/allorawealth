-- Sequential, collision-free reference numbers (replaces date+random suffixes).
-- One sequence per number type; TXN is shared across all wallet_transactions
-- producers (deposits, withdrawals, investments, repayments).
CREATE SEQUENCE IF NOT EXISTS investor_number_seq;
CREATE SEQUENCE IF NOT EXISTS wallet_number_seq;
CREATE SEQUENCE IF NOT EXISTS investment_number_seq;
CREATE SEQUENCE IF NOT EXISTS withdrawal_number_seq;
CREATE SEQUENCE IF NOT EXISTS wallet_transaction_number_seq;
CREATE SEQUENCE IF NOT EXISTS journal_number_seq;
CREATE SEQUENCE IF NOT EXISTS reconciliation_number_seq;
