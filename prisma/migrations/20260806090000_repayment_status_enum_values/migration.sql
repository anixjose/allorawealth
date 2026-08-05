-- New enum values must be committed in their own migration before any
-- other statement (default, column, etc.) can reference them.
ALTER TYPE "RepaymentStatus" ADD VALUE 'RECEIVED';
ALTER TYPE "RepaymentStatus" ADD VALUE 'DISBURSED';
