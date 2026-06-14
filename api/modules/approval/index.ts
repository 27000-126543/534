import { PrismaClient } from '@prisma/client';
import { ApprovalService } from './approval.service';

let approvalService: ApprovalService | null = null;

export function getApprovalService(prisma: PrismaClient): ApprovalService {
  if (!approvalService) {
    approvalService = new ApprovalService(prisma);
  }
  return approvalService;
}

export { ApprovalService };
export * from './types';
export * from './approval.service';
