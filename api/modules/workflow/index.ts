export { WorkflowEngine } from './workflow.engine';
export * from './types';
export * from './state.transitions';

import { PrismaClient } from '@prisma/client';
import { WorkflowEngine } from './workflow.engine';

let workflowEngineInstance: WorkflowEngine | null = null;

export function getWorkflowEngine(prisma: PrismaClient): WorkflowEngine {
  if (!workflowEngineInstance) {
    workflowEngineInstance = new WorkflowEngine(prisma);
  }
  return workflowEngineInstance;
}

export default getWorkflowEngine;
