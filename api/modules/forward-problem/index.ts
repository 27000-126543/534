export { ForwardProblemSolver } from './forward.solver';
export * from './types';
export * from './bem.utils';

import { PrismaClient } from '@prisma/client';
import { ForwardProblemSolver } from './forward.solver';

let forwardSolverInstance: ForwardProblemSolver | null = null;

export function getForwardProblemSolver(prisma: PrismaClient): ForwardProblemSolver {
  if (!forwardSolverInstance) {
    forwardSolverInstance = new ForwardProblemSolver(prisma);
  }
  return forwardSolverInstance;
}

export default getForwardProblemSolver;
