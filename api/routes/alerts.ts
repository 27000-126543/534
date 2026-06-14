import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAlertService } from '../modules/alert-system';
import { AlertType, AlertSeverity } from '../../../shared/types/enums';
import { ReviewDecision, AlertQueryParams } from '../modules/alert-system/types';

const router = Router();
const prisma = new PrismaClient();
const alertService = getAlertService(prisma);

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      taskId,
      alertType,
      severity,
      status,
      startDate,
      endDate,
      page,
      pageSize
    } = req.query;

    const params: AlertQueryParams = {
      taskId: taskId as string,
      alertType: alertType as AlertType,
      severity: severity as AlertSeverity,
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined
    };

    const result = await alertService.getAlertList(params);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get alert list error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:alertId', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;

    const alert = await alertService.getAlert(alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      success: true,
      alert
    });

  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:alertId/process', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { autoProcess = true } = req.body;

    const result = await alertService.processAlert(alertId, autoProcess);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Process alert error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/review', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      alertId,
      decision,
      comments,
      recommendedAlgorithm,
      recommendedRegularization
    } = req.body;

    if (!alertId || !decision || !comments) {
      return res.status(400).json({ error: 'alertId, decision, and comments are required' });
    }

    const reviewDecision: ReviewDecision = {
      alertId,
      reviewerId: userId,
      decision,
      comments,
      recommendedAlgorithm,
      recommendedRegularization,
      reviewedAt: new Date()
    };

    const result = await alertService.reviewAlert(reviewDecision);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Review alert error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/monitoring/start/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    await alertService.startRealTimeMonitoring(taskId);

    res.json({
      success: true,
      message: 'Real-time monitoring started for task ' + taskId
    });

  } catch (error) {
    console.error('Start monitoring error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/monitoring/stop/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    await alertService.stopRealTimeMonitoring(taskId);

    res.json({
      success: true,
      message: 'Real-time monitoring stopped for task ' + taskId
    });

  } catch (error) {
    console.error('Stop monitoring error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/monitoring/metrics/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const metrics = alertService.getRealTimeMetrics(taskId);

    if (!metrics) {
      return res.status(404).json({ error: 'No monitoring data for this task' });
    }

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('Get monitoring metrics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/monitoring/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = req.body;

    if (!metrics.taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    await alertService.updateRealTimeMetrics({
      ...metrics,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      message: 'Metrics updated'
    });

  } catch (error) {
    console.error('Update monitoring metrics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await alertService.getMonitoringConfig();

    res.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('Get monitoring config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = req.body;

    const updatedConfig = await alertService.updateMonitoringConfig(config);

    res.json({
      success: true,
      config: updatedConfig
    });

  } catch (error) {
    console.error('Update monitoring config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/adjustment-logs', async (req: Request, res: Response) => {
  try {
    const { taskId, alertId } = req.query;

    const logs = await alertService.getAdjustmentLogs(
      taskId as string,
      alertId as string
    );

    res.json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('Get adjustment logs error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/notifications/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const count = await alertService.getUnreadNotificationCount(userId);

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/notifications/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notificationId } = req.params;

    const success = await alertService.markNotificationRead(notificationId, userId);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found or not owned by user' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
