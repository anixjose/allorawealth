import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaLike = PrismaService | Prisma.TransactionClient;

/**
 * Each prefix is backed by its own Postgres sequence (migration
 * 20260805120000_reference_number_sequences), so numbers are strictly
 * increasing and collision-free even under concurrent requests — a DB
 * sequence survives concurrent transactions without ever handing out the
 * same value twice, which a client-side counter or random suffix can't
 * guarantee. TXN is shared across deposits/withdrawals/investments/
 * repayments: they all post into the same wallet_transactions ledger, so
 * one running number across all of them is the correct "sequential" view.
 */
const SEQUENCE_BY_PREFIX: Record<string, string> = {
  INV: 'investor_number_seq',
  BUS: 'business_number_seq',
  WAL: 'wallet_number_seq',
  INVST: 'investment_number_seq',
  WDR: 'withdrawal_number_seq',
  DEP: 'deposit_number_seq',
  TXN: 'wallet_transaction_number_seq',
  JRN: 'journal_number_seq',
  REC: 'reconciliation_number_seq',
  EMP: 'employee_number_seq',
};

/** Human-readable, strictly sequential reference numbers (e.g. INV-000042). */
export async function generateReferenceNumber(client: PrismaLike, prefix: string): Promise<string> {
  const sequenceName = SEQUENCE_BY_PREFIX[prefix];
  if (!sequenceName) {
    throw new Error(`No sequence configured for reference number prefix "${prefix}"`);
  }

  // sequenceName is always one of the fixed values above, never caller input, so this isn't injectable.
  const rows = await client.$queryRawUnsafe<Array<{ next: bigint }>>(`SELECT nextval('${sequenceName}') AS next`);
  return `${prefix}-${rows[0].next.toString().padStart(6, '0')}`;
}
