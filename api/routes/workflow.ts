import { Router, Request, Response } from 'express';
import { PrismaClient, TaskStatus } from '@prisma/client';
import { getWorkflowEngine } from '../modules/workflow';
import { RoleCode } from '../../../shared/types/enums';
import { RecomputeRequest } from '../../../shared/types/api';

const router = Router();
const prisma = new PrismaClient();
const workflowEngine = getWorkflowEngine(prisma);

router.post('/transition/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { targetStatus, reason, algorithmParams, algorithmType } = req.body;
    
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.roleCode as RoleCode;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await workflowEngine.transition(
      {
        taskId,
        currentStatus: task.status as TaskStatus,
        userId,
        userRole,
        reason,
        algorithmParams,
        algorithmType
      },
      targetStatus as TaskStatus
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        patient: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
            title: true
          }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            operator: {
              select: {
                id: true,
                fullName: true,
                title: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      task: updatedTask,
      transition: result
    });

  } catch (error) {
    console.error('Transition error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/auto-advance/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.roleCode as RoleCode;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await workflowEngine.autoAdvance(taskId, userId, userRole);

    if (!result.success) {
      return res.status(400).json(result);
    }

    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        patient: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
            title: true
          }
        }
      }
    });

    res.json({
      success: true,
      task: updatedTask,
      transition: result
    });

  } catch (error) {
    console.error('Auto advance error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/retry/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { reason, algorithmParams, algorithmType } = req.body as RecomputeRequest;
    
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.roleCode as RoleCode;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await workflowEngine.retryFromFailed(
      taskId,
      userId,
      userRole,
      reason,
      algorithmParams,
      algorithmType
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        patient: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
            title: true
          }
        }
      }
    });

    res.json({
      success: true,
      task: updatedTask,
      transition: result
    });

  } catch (error) {
    console.error('Retry error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/history/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const history = await workflowEngine.getTaskHistory(taskId);
    const progress = await workflowEngine.getTaskProgress(taskId);
    const currentApproval = await workflowEngine.getCurrentApproval(taskId);

    res.json({
      success: true,
      history,
      progress,
      currentApproval
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/progress/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const progress = await workflowEngine.getTaskProgress(taskId);

    res.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/valid-transitions/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userRole = (req as any).user?.roleCode as RoleCode;
    
    if (!userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { getValidTransitions } = require('../modules/workflow/state.transitions');
    const allTransitions = getValidTransitions(task.status as TaskStatus);
    
    const allowedTransitions = allTransitions.filter(
      (t: any) => t.allowedRoles.includes(userRole)
    );

    res.json({
      success: true,
      currentStatus: task.status,
      validTransitions: allowedTransitions
    });

  } catch (error) {
    console.error('Get valid transitions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/check-patient-deviation/:patientId', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    
    const result = await workflowEngine.checkPatientDeviation(patientId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Check patient deviation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/suspend-patient/:patientId', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { reason, triggeredByTaskId, deviationMm } = req.body;
    
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.roleCode as RoleCode;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (userRole !== RoleCode.ADMIN && userRole !== RoleCode.CHIEF_SCIENTIST) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const success = await workflowEngine.suspendPatient(
      patientId,
      userId,
      reason,
      triggeredByTaskId,
      deviationMm
    );

    if (!success) {
      return res.status(500).json({ error: 'Failed to suspend patient' });
    }

    res.json({
      success: true,
      message: 'Patient suspended successfully'
    });

  } catch (error) {
    console.error('Suspend patient error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
