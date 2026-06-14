export { HeadModelBuilder } from './head-model.builder';
export * from './types';
export * from './mesh.utils';

import { PrismaClient } from '@prisma/client';
import { HeadModelBuilder } from './head-model.builder';

let headModelBuilderInstance: HeadModelBuilder | null = null;

export function getHeadModelBuilder(prisma: PrismaClient): HeadModelBuilder {
  if (!headModelBuilderInstance) {
    headModelBuilderInstance = new HeadModelBuilder(prisma);
  }
  return headModelBuilderInstance;
}

export default getHeadModelBuilder;
