import { PrismaClient } from '@prisma/client';
import { SourceImagingSolver } from './source.imaging.solver';
import { SourceImagingConfig } from './types';

let sourceImagingSolver: SourceImagingSolver | null = null;

export function getSourceImagingSolver(
  prisma: PrismaClient,
  config?: Partial<SourceImagingConfig>
): SourceImagingSolver {
  if (!sourceImagingSolver) {
    sourceImagingSolver = new SourceImagingSolver(prisma, config);
  }
  return sourceImagingSolver;
}

export { SourceImagingSolver };
export * from './types';
export * from './algorithm.utils';
export * from './source.imaging.solver';
