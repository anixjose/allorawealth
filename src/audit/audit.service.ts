import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

export interface AuditLogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  reason?: string | null;
}

/**
 * Every sensitive action needs who/what/when/before/after/ip/reason
 * (blueprint §27). `record` takes an explicit Prisma client so callers
 * posting a journal can write the audit row inside the *same* DB
 * transaction as the financial change it describes.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput, client: PrismaTransactionClient = this.prisma) {
    return client.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        ipAddress: input.ipAddress ?? null,
        reason: input.reason ?? null,
      },
    });
  }
}
