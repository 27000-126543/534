import { PrismaClient } from '@prisma/client';
import { TargetOptimizer } from './target.optimizer';
import { OptimizationConfig } from './types';

let targetOptimizer: TargetOptimizer | null = null;

export function getTargetOptimizer(
  prisma: PrismaClient,
  config?: Partial<OptimizationConfig>
): TargetOptimizer {
  if (!targetOptimizer) {
    targetOptimizer = new TargetOptimizer(prisma, config);
  }
  return targetOptimizer;
}

export { TargetOptimizer };
export * from './types';
export * from './optimization.utils';
export * from './target.optimizer';
