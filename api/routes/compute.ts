import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getHeadModelBuilder } from '../modules/head-model';
import { getForwardProblemSolver } from '../modules/forward-problem';
import { getSourceImagingSolver } from '../modules/source-imaging';
import { getTargetOptimizer } from '../modules/target-optimization';
import { HeadModelBuildParams } from '../modules/head-model/types';
import { ForwardProblemParams, LeadFieldConfig } from '../modules/forward-problem/types';
import { SourceImagingParams } from '../modules/source-imaging/types';
import { TargetOptimizationParams } from '../modules/target-optimization/types';
import { AlgorithmType, StimulationPattern } from 'shared/types/enums';

const router = Router();
const prisma = new PrismaClient();
const headModelBuilder = getHeadModelBuilder(prisma);
const forwardSolver = getForwardProblemSolver(prisma);
const sourceImagingSolver = getSourceImagingSolver(prisma);
const targetOptimizer = getTargetOptimizer(prisma);

router.post('/head-model/build/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const {
      mriSegmentationPath,
      electrodePositionsPath,
      conductivityParams,
      meshResolution,
      smoothingIterations
    } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const params: HeadModelBuildParams = {
      taskId,
      mriSegmentationPath: mriSegmentationPath || '',
      electrodePositionsPath: electrodePositionsPath || '',
      conductivityParams,
      meshResolution,
      smoothingIterations
    };

    const result = await headModelBuilder.buildHeadModel(params);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Head model build error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/head-model/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const headModel = await headModelBuilder.getHeadModel(taskId);

    if (!headModel) {
      return res.status(404).json({ error: 'Head model not found' });
    }

    res.json({
      success: true,
      headModel
    });

  } catch (error) {
    console.error('Get head model error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/head-model/quality/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const quality = await headModelBuilder.getHeadModelQuality(taskId);

    if (!quality) {
      return res.status(404).json({ error: 'Head model not found' });
    }

    res.json({
      success: true,
      quality
    });

  } catch (error) {
    console.error('Get head model quality error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/head-model/sources/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const sources = await headModelBuilder.getSourcePositions(taskId);

    if (!sources) {
      return res.status(404).json({ error: 'Head model not found' });
    }

    res.json({
      success: true,
      sources,
      count: sources.length
    });

  } catch (error) {
    console.error('Get source positions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/forward/solve/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const {
      headModelId,
      method = 'bem',
      sourceModel = 'cortical',
      conductivityParams,
      leadfieldConfig
    } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { headModel: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const actualHeadModelId = headModelId || task.headModelId;
    if (!actualHeadModelId) {
      return res.status(400).json({ error: 'No head model available for this task' });
    }

    const params: ForwardProblemParams = {
      taskId,
      headModelId: actualHeadModelId,
      method,
      sourceModel,
      conductivityParams
    };

    const result = await forwardSolver.solveForwardProblem(
      params,
      leadfieldConfig as Partial<LeadFieldConfig>
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Forward problem solve error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/forward/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const forwardResult = await forwardSolver.getForwardResult(taskId);

    if (!forwardResult) {
      return res.status(404).json({ error: 'Forward result not found' });
    }

    res.json({
      success: true,
      forwardResult
    });

  } catch (error) {
    console.error('Get forward result error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/forward/leadfield/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const leadfield = await forwardSolver.getLeadfieldMatrix(taskId);

    if (!leadfield) {
      return res.status(404).json({ error: 'Forward result not found' });
    }

    res.json({
      success: true,
      channels: leadfield.channels,
      sources: leadfield.sources,
      matrixShape: [leadfield.matrix.length, leadfield.matrix[0]?.length || 0],
      matrix: leadfield.matrix
    });

  } catch (error) {
    console.error('Get leadfield matrix error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/forward/metrics/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const metrics = await forwardSolver.getMatrixMetrics(taskId);

    if (!metrics) {
      return res.status(404).json({ error: 'Forward result not found' });
    }

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('Get matrix metrics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/source/solve/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const {
      forwardResultId,
      eegSignalPath,
      algorithmType = AlgorithmType.SLORETA,
      algorithmParams
    } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { forwardResult: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const actualForwardResultId = forwardResultId || task.forwardResultId;
    if (!actualForwardResultId) {
      return res.status(400).json({ error: 'No forward result available for this task' });
    }

    const params: SourceImagingParams = {
      taskId,
      forwardResultId: actualForwardResultId,
      eegSignalPath: eegSignalPath || '',
      algorithmType,
      algorithmParams
    };

    const result = await sourceImagingSolver.solveSourceImaging(params);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Source imaging solve error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/source/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const sourceResult = await sourceImagingSolver.getSourceResult(taskId);

    if (!sourceResult) {
      return res.status(404).json({ error: 'Source result not found' });
    }

    res.json({
      success: true,
      sourceResult
    });

  } catch (error) {
    console.error('Get source result error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/source/activity/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { timeWindow } = req.query;

    const activity = await sourceImagingSolver.getSourceActivity(
      taskId,
      timeWindow !== undefined ? parseInt(timeWindow as string) : undefined
    );

    if (!activity) {
      return res.status(404).json({ error: 'Source result not found' });
    }

    res.json({
      success: true,
      sourcePositions: activity.sourcePositions,
      activity: activity.activity,
      timePoint: activity.timePoint,
      count: activity.activity.length
    });

  } catch (error) {
    console.error('Get source activity error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/source/metrics/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const metrics = await sourceImagingSolver.getMonitoringMetrics(taskId);

    if (!metrics) {
      return res.status(404).json({ error: 'Source result not found' });
    }

    res.json({
      success: true,
      metrics,
      count: metrics.length
    });

  } catch (error) {
    console.error('Get monitoring metrics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/target/optimize/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const {
      sourceResultId,
      coilModelId,
      targetRegion,
      frequencyBand,
      targetIntensity,
      stimulationPattern,
      searchRadius,
      gridResolution,
      maxIterations
    } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { sourceResult: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const actualSourceResultId = sourceResultId || task.sourceResultId;
    if (!actualSourceResultId) {
      return res.status(400).json({ error: 'No source result available for this task' });
    }

    const params: TargetOptimizationParams = {
      taskId,
      sourceResultId: actualSourceResultId,
      coilModelId: coilModelId || 'coil-001',
      targetRegion,
      frequencyBand,
      targetIntensity,
      stimulationPattern: stimulationPattern as StimulationPattern,
      searchRadius,
      gridResolution,
      maxIterations
    };

    const result = await targetOptimizer.optimizeTarget(params);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Target optimization error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/target/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const targetPlan = await targetOptimizer.getTargetPlan(taskId);

    if (!targetPlan) {
      return res.status(404).json({ error: 'Target plan not found' });
    }

    res.json({
      success: true,
      targetPlan
    });

  } catch (error) {
    console.error('Get target plan error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/target/coils', async (req: Request, res: Response) => {
  try {
    const coils = await targetOptimizer.getAvailableCoils();

    res.json({
      success: true,
      coils,
      count: coils.length
    });

  } catch (error) {
    console.error('Get available coils error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/target/pulse-schemes', async (req: Request, res: Response) => {
  try {
    const schemes = await targetOptimizer.getAvailablePulseSchemes();

    res.json({
      success: true,
      schemes
    });

  } catch (error) {
    console.error('Get pulse schemes error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/target/recommend', async (req: Request, res: Response) => {
  try {
    const { patientId, targetRegion, historicalResults, postStimulationEffects } = req.body;

    if (!patientId || !targetRegion) {
      return res.status(400).json({ error: 'patientId and targetRegion are required' });
    }

    const recommendation = await targetOptimizer.getRecommendation({
      patientId,
      targetRegion,
      historicalResults: historicalResults || [],
      postStimulationEffects: postStimulationEffects || []
    });

    res.json({
      success: true,
      recommendation
    });

  } catch (error) {
    console.error('Get recommendation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/target/export/coordinates/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { format = 'json' } = req.query;

    const data = await targetOptimizer.exportTargetCoordinates(
      taskId,
      format as 'json' | 'csv' | 'nifti'
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="target_coordinates_${taskId}.csv"`);
      return res.send(data);
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Export target coordinates error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/target/export/source-data/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { brainRegion, frequencyBand, stimulationPattern, format = 'json' } = req.query;

    const data = await targetOptimizer.exportSourceData(
      taskId,
      {
        brainRegion: brainRegion as string,
        frequencyBand: frequencyBand as string,
        stimulationPattern: stimulationPattern as string,
        format: format as 'json' | 'csv' | 'mat'
      }
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="source_data_${taskId}.csv"`);
      return res.send(data);
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Export source data error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
