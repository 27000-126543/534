import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getApprovalService } from '../modules/approval';
import { ApprovalQueryParams } from '../modules/approval/types';
import { RoleCode } from '../../../shared/types/enums';

const router = Router();
const prisma = new PrismaClient();
const approvalService = getApprovalService(prisma);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      taskId,
      type,
      status,
      stage,
      submittedBy,
      startDate,
      endDate,
      page,
      pageSize
    } = req.query;

    const params: ApprovalQueryParams = {
      taskId: taskId as string,
      type: type as any,
      status: status as any,
      stage: stage ? parseInt(stage as string) : undefined,
      submittedBy: submittedBy as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined
    };

    const result = await approvalService.getApprovalList(params, userId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get approval list error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:approvalId', async (req: Request, res: Response) => {
  try {
    const { approvalId } = req.params;

    const approval = await approvalService.getApproval(approvalId);

    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    res.json({
      success: true,
      approval
    });

  } catch (error) {
    console.error('Get approval error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/submit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { taskId, type, comments } = req.body;

    if (!taskId || !type) {
      return res.status(400).json({ error: 'taskId and type are required' });
    }

    const result = await approvalService.submitForApproval(
      taskId,
      type,
      userId,
      comments
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Submit approval error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:approvalId/process', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { approvalId } = req.params;
    const { decision, comments, attachments } = req.body;

    if (!decision || !comments) {
      return res.status(400).json({ error: 'decision and comments are required' });
    }

    const result = await approvalService.processApproval(
      approvalId,
      userId,
      decision,
      comments,
      attachments
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Process approval error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:approvalId/resubmit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { approvalId } = req.params;
    const { comments } = req.body;

    const result = await approvalService.resubmitForApproval(
      approvalId,
      userId,
      comments
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Resubmit approval error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/history/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const history = await approvalService.getApprovalHistory(taskId);

    res.json({
      success: true,
      history,
      count: history.length
    });

  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/permissions/:roleCode', async (req: Request, res: Response) => {
  try {
    const { roleCode } = req.params;

    const permissions = await approvalService.getRolePermissions(roleCode as RoleCode);

    res.json({
      success: true,
      roleCode,
      permissions
    });

  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/flows/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    const config = await approvalService.getApprovalFlowConfig(type);

    if (!config) {
      return res.status(404).json({ error: 'Approval flow not found' });
    }

    res.json({
      success: true,
      type,
      config
    });

  } catch (error) {
    console.error('Get approval flow error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/navigation/push/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const result = await approvalService.pushToNavigationSystem(taskId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Push to navigation system error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/navigation/status/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const status = await approvalService.getNavigationStatus(taskId);

    res.json(status);

  } catch (error) {
    console.error('Get navigation status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/check-permission', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { resource, action } = req.query;

    if (!resource || !action) {
      return res.status(400).json({ error: 'resource and action are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasPermission = approvalService.checkPermission(
      user.role.code as RoleCode,
      resource as string,
      action as any
    );

    res.json({
      success: true,
      hasPermission,
      roleCode: user.role.code
    });

  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
