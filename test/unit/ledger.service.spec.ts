import { JournalService } from '../../src/ledger/journal.service';
import { AuditService } from '../../src/audit/audit.service';
import { UnbalancedJournalException } from '../../src/ledger/exceptions/unbalanced-journal.exception';
import { InvalidJournalLineException } from '../../src/ledger/exceptions/invalid-journal-line.exception';

function buildMockTx() {
  const accountsByCode = new Map([
    ['1010', 'acc-bank'],
    ['2010', 'acc-wallet-liability'],
  ]);

  return {
    account: {
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        const codes: string[] = where.accountCode.in;
        return Promise.resolve(
          codes
            .filter((c) => accountsByCode.has(c))
            .map((c) => ({ accountCode: c, id: accountsByCode.get(c) })),
        );
      }),
    },
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ next: BigInt(1) }]),
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: 'je-1', journalNumber: 'JRN-1' }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'je-1', lines: [] }),
    },
    journalLine: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };
}

function buildService() {
  const mockTx = buildMockTx();
  const mockPrisma = {
    $transaction: jest.fn((cb: any) => cb(mockTx)),
  } as any;
  const auditService = new AuditService(mockPrisma);
  const service = new JournalService(mockPrisma, auditService);
  return { service, mockPrisma, mockTx };
}

describe('JournalService', () => {
  const baseInput = {
    transactionDate: new Date('2026-08-01'),
    transactionType: 'DEPOSIT',
    referenceType: 'DEPOSIT',
    referenceId: 'dep-1',
    currency: 'INR',
    createdById: 'user-1',
  };

  it('posts a balanced journal (debit === credit)', async () => {
    const { service, mockTx } = buildService();

    await service.postJournal({
      ...baseInput,
      lines: [
        { accountCode: '1010', debit: 10000 },
        { accountCode: '2010', credit: 10000 },
      ],
    });

    expect(mockTx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'POSTED' }),
      }),
    );
    expect(mockTx.journalLine.createMany).toHaveBeenCalled();
  });

  it('rejects an unbalanced journal (debit 10,000 vs credit 9,500)', async () => {
    const { service, mockPrisma } = buildService();

    await expect(
      service.postJournal({
        ...baseInput,
        lines: [
          { accountCode: '1010', debit: 10000 },
          { accountCode: '2010', credit: 9500 },
        ],
      }),
    ).rejects.toThrow(UnbalancedJournalException);

    // Must reject before ever opening a transaction — no partial writes.
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a line with both debit and credit set', async () => {
    const { service } = buildService();

    await expect(
      service.postJournal({
        ...baseInput,
        lines: [
          { accountCode: '1010', debit: 100, credit: 100 },
          { accountCode: '2010', credit: 100 },
        ],
      }),
    ).rejects.toThrow(InvalidJournalLineException);
  });

  it('rejects a line with neither debit nor credit set', async () => {
    const { service } = buildService();

    await expect(
      service.postJournal({
        ...baseInput,
        lines: [
          { accountCode: '1010' },
          { accountCode: '2010', credit: 100 },
        ],
      }),
    ).rejects.toThrow(InvalidJournalLineException);
  });

  it('rejects a zero-total journal', async () => {
    const { service } = buildService();

    await expect(
      service.postJournal({
        ...baseInput,
        lines: [
          { accountCode: '1010', debit: 0 },
          { accountCode: '2010', credit: 0 },
        ],
      }),
    ).rejects.toThrow(InvalidJournalLineException);
  });

  it('marks the journal PENDING_APPROVAL when requiresApproval is set (maker-checker)', async () => {
    const { service, mockTx } = buildService();

    await service.postJournal({
      ...baseInput,
      requiresApproval: true,
      lines: [
        { accountCode: '1010', debit: 500 },
        { accountCode: '2010', credit: 500 },
      ],
    });

    expect(mockTx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING_APPROVAL', postedAt: null }),
      }),
    );
  });
});
