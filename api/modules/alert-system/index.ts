import { PrismaClient } from '@prisma/client';
import { AlertService } from './alert.service';
import { MonitoringConfig } from './types';

let alertService: AlertService | null = null;

export function getAlertService(
  prisma: PrismaClient,
  config?: Partial<MonitoringConfig>
): AlertService {
  if (!alertService) {
    alertService = new AlertService(prisma, config);
  }
  return alertService;
}

export { AlertService };
export * from './types';
export * from './alert.service';
