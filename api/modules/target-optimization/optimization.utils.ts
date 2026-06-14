import {
  CoilModel,
  CoilPlacement,
  ElectricFieldResult,
  StimulationTarget,
  OptimizationConfig,
  PulseScheme,
  HistoricalResult,
  PostStimulationEffect,
  RecommendationResult,
  DEFAULT_COIL_MODELS,
  DEFAULT_OPTIMIZATION_CONFIG
} from './types';
import { StimulationPattern } from 'shared/types/enums';
import {
  calculateEuclideanDistance,
  normalizeVector,
  dotProduct,
  crossProduct,
  matrixMultiply,
  rotateVector
} from '../../utils/math';

export function getCoilModel(coilId: string): CoilModel | undefined {
  return DEFAULT_COIL_MODELS.find(c => c.id === coilId) || DEFAULT_COIL_MODELS[0];
}

export function calculateElectricField(
  coilModel: CoilModel,
  coilPlacement: CoilPlacement,
  targetPositions: number[][],
  conductivity: number = 0.33
): ElectricFieldResult {
  const positions = targetPositions;
  const nPositions = positions.length;
  const eFieldMagnitude: number[] = new Array(nPositions);
  const eFieldDirection: number[][] = new Array(nPositions);

  const coilPos = coilPlacement.position;
  const coilOrientation = normalizeVector(coilPlacement.orientation);

  const mu0 = 4 * Math.PI * 1e-7;
  const coilRadius = coilModel.outerDiameter / 2;
  const nTurns = coilModel.windingTurns;
  const current = coilModel.maximumCurrent * 0.8;

  const dtheta = Math.PI / 12;
  const coilElements: { pos: [number, number, number]; dir: [number, number, number] }[] = [];
  
  for (let i = 0; i < 24; i++) {
    const theta = i * dtheta;
    const localX = Math.cos(theta) * coilRadius;
    const localY = Math.sin(theta) * coilRadius;
    
    const perp1 = normalizeVector(crossProduct(coilOrientation, [1, 0, 0]));
    const perp2 = normalizeVector(crossProduct(coilOrientation, perp1));
    
    const worldPos: [number, number, number] = [
      coilPos[0] + localX * perp1[0] + localY * perp2[0],
      coilPos[1] + localX * perp1[1] + localY * perp2[1],
      coilPos[2] + localX * perp1[2] + localY * perp2[2]
    ];
    
    const tangent = normalizeVector([
      -Math.sin(theta) * perp1[0] + Math.cos(theta) * perp2[0],
      -Math.sin(theta) * perp1[1] + Math.cos(theta) * perp2[1],
      -Math.sin(theta) * perp1[2] + Math.cos(theta) * perp2[2]
    ]);
    
    coilElements.push({ pos: worldPos, dir: tangent });
  }

  for (let i = 0; i < nPositions; i++) {
    const targetPos = positions[i];
    let totalE = [0, 0, 0];

    for (const element of coilElements) {
      const r: [number, number, number] = [
        targetPos[0] - element.pos[0],
        targetPos[1] - element.pos[1],
        targetPos[2] - element.pos[2]
      ];
      const rMag = calculateEuclideanDistance([0, 0, 0], r);
      
      if (rMag < 1) {
        totalE = [0, 0, 0];
        break;
      }

      const dlCrossR = crossProduct(element.dir, r);
      const dB: [number, number, number] = [
        dlCrossR[0] / Math.pow(rMag, 3),
        dlCrossR[1] / Math.pow(rMag, 3),
        dlCrossR[2] / Math.pow(rMag, 3)
      ];

      const B = [
        dB[0] * (mu0 * nTurns * current) / (4 * Math.PI),
        dB[1] * (mu0 * nTurns * current) / (4 * Math.PI),
        dB[2] * (mu0 * nTurns * current) / (4 * Math.PI)
      ];

      const curlB = crossProduct(r, B);
      const E = [
        -curlB[0] / (2 * Math.PI * rMag * conductivity),
        -curlB[1] / (2 * Math.PI * rMag * conductivity),
        -curlB[2] / (2 * Math.PI * rMag * conductivity)
      ];

      totalE[0] += E[0];
      totalE[1] += E[1];
      totalE[2] += E[2];
    }

    const eMag = Math.sqrt(totalE[0] ** 2 + totalE[1] ** 2 + totalE[2] ** 2) * 1000;
    eFieldMagnitude[i] = eMag;
    eFieldDirection[i] = eMag > 0 ? normalizeVector(totalE) : [0, 0, 1];
  }

  const maxEF = Math.max(...eFieldMagnitude);
  const meanEF = eFieldMagnitude.reduce((a, b) => a + b, 0) / nPositions;
  
  const threshold = maxEF * 0.5;
  let focalVolume = 0;
  let focalCount = 0;
  for (let i = 0; i < nPositions; i++) {
    if (eFieldMagnitude[i] > threshold) {
      focalCount++;
    }
  }
  focalVolume = focalCount * Math.pow(5, 3);

  const focalityIndex = maxEF > 0 ? (threshold * focalCount) / (meanEF * nPositions) : 0;

  return {
    positions,
    eFieldMagnitude,
    eFieldDirection,
    maximumEF: maxEF,
    meanEF,
    focalVolume,
    focalityIndex
  };
}

export function identifyStimulationTarget(
  sourcePositions: number[][],
  sourceActivity: number[],
  targetRegion?: string
): StimulationTarget {
  let maxIdx = 0;
  let maxActivity = -Infinity;
  
  for (let i = 0; i < sourceActivity.length; i++) {
    if (sourceActivity[i] > maxActivity) {
      maxActivity = sourceActivity[i];
      maxIdx = i;
    }
  }

  const targetPos = sourcePositions[maxIdx];
  const hemisphere = targetPos[0] < 0 ? 'left' : targetPos[0] > 0 ? 'right' : 'bilateral';
  const region = targetRegion || getBrainRegion(targetPos as [number, number, number]);

  let activitySum = 0;
  let weightSum = 0;
  const radius = 15;

  for (let i = 0; i < sourcePositions.length; i++) {
    const dist = calculateEuclideanDistance(targetPos, sourcePositions[i]);
    if (dist < radius) {
      const weight = 1 - dist / radius;
      activitySum += sourceActivity[i] * weight;
      weightSum += weight;
    }
  }

  const intensity = weightSum > 0 ? activitySum / weightSum : maxActivity;

  return {
    id: `target-${Date.now()}`,
    position: targetPos as [number, number, number],
    region,
    hemisphere,
    size: radius * 2,
    intensity
  };
}

function getBrainRegion(position: [number, number, number]): string {
  const [x, y, z] = position;

  if (y > 40) {
    if (x < -20) return '左前额叶';
    if (x > 20) return '右前额叶';
    return '前额叶';
  }
  if (y > 10) {
    if (x < -20) return '左运动前区';
    if (x > 20) return '右运动前区';
    return '运动前区';
  }
  if (y > -20) {
    if (x < -20) return '左运动皮层';
    if (x > 20) return '右运动皮层';
    return '感觉运动皮层';
  }
  if (y > -50) {
    if (x < -20) return '左顶叶';
    if (x > 20) return '右顶叶';
    return '顶叶';
  }
  if (x < -40) return '左颞叶';
  if (x > 40) return '右颞叶';
  if (y < -60) return '枕叶';
  
  return '皮层下';
}

export function generateCoilPlacements(
  target: StimulationTarget,
  config: OptimizationConfig
): CoilPlacement[] {
  const placements: CoilPlacement[] = [];
  const coilModels = DEFAULT_COIL_MODELS;

  for (const coilModel of coilModels) {
    for (let dx = -config.searchRadius; dx <= config.searchRadius; dx += config.gridResolution) {
      for (let dy = -config.searchRadius; dy <= config.searchRadius; dy += config.gridResolution) {
        for (let dz = 10; dz <= 30; dz += 10) {
          const position: [number, number, number] = [
            target.position[0] + dx,
            target.position[1] + dy,
            target.position[2] + dz
          ];

          for (let azimuth = 0; azimuth < 360; azimuth += config.angleStep * 2) {
            for (let elevation = 30; elevation <= 90; elevation += config.angleStep) {
              const azimuthRad = azimuth * Math.PI / 180;
              const elevationRad = elevation * Math.PI / 180;
              
              const orientation: [number, number, number] = [
                Math.sin(elevationRad) * Math.cos(azimuthRad),
                Math.sin(elevationRad) * Math.sin(azimuthRad),
                Math.cos(elevationRad)
              ];

              for (let rotation = 0; rotation < 360; rotation += config.angleStep * 4) {
                placements.push({
                  position,
                  orientation,
                  rotationAngle: rotation,
                  coilModelId: coilModel.id
                });
              }
            }
          }
        }
      }
    }
  }

  return placements;
}

export function evaluatePlacement(
  placement: CoilPlacement,
  coilModel: CoilModel,
  target: StimulationTarget,
  sourcePositions: number[][],
  sourceActivity: number[],
  config: OptimizationConfig
): {
  score: number;
  electricField: ElectricFieldResult;
  coverage: number;
  focality: number;
  safety: number;
} {
  const eField = calculateElectricField(coilModel, placement, sourcePositions);

  let targetCoverage = 0;
  let coveredActivity = 0;
  let totalActivity = 0;
  const targetRadius = target.size / 2;

  for (let i = 0; i < sourcePositions.length; i++) {
    const dist = calculateEuclideanDistance(target.position, sourcePositions[i]);
    totalActivity += sourceActivity[i];
    
    if (dist < targetRadius && eField.eFieldMagnitude[i] > eField.maximumEF * 0.3) {
      targetCoverage++;
      coveredActivity += sourceActivity[i];
    }
  }

  const coverage = totalActivity > 0 ? coveredActivity / totalActivity : 0;
  const focality = eField.focalityIndex;
  
  const maxSafeField = config.safetyThreshold;
  const safety = Math.max(0, 1 - (eField.maximumEF / maxSafeField - 1) * 2);

  const score = 
    config.focalityWeight * Math.min(1, focality) +
    config.coverageWeight * coverage +
    config.safetyWeight * Math.max(0, safety);

  return {
    score,
    electricField: eField,
    coverage,
    focality,
    safety: Math.max(0, Math.min(1, safety))
  };
}

export function optimizeCoilPlacement(
  target: StimulationTarget,
  coilModel: CoilModel,
  sourcePositions: number[][],
  sourceActivity: number[],
  config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG
): {
  optimalPlacement: CoilPlacement;
  electricField: ElectricFieldResult;
  targetCoverage: number;
  focalityIndex: number;
  safetyMargin: number;
} {
  const initialPlacements = generateCoilPlacements(target, config).slice(0, 100);
  
  let bestScore = -Infinity;
  let bestPlacement: CoilPlacement = initialPlacements[0];
  let bestEvaluation: any = null;

  for (const placement of initialPlacements) {
    const currentCoil = getCoilModel(placement.coilModelId) || coilModel;
    const evaluation = evaluatePlacement(
      placement,
      currentCoil,
      target,
      sourcePositions,
      sourceActivity,
      config
    );

    if (evaluation.score > bestScore) {
      bestScore = evaluation.score;
      bestPlacement = placement;
      bestEvaluation = evaluation;
    }
  }

  let currentPlacement = { ...bestPlacement };
  
  for (let iteration = 0; iteration < config.maxIterations; iteration++) {
    const step = Math.max(1, config.gridResolution * (1 - iteration / config.maxIterations));
    let improved = false;

    const neighbors = generateNeighborPlacements(currentPlacement, step, config.angleStep);
    
    for (const neighbor of neighbors) {
      const currentCoil = getCoilModel(neighbor.coilModelId) || coilModel;
      const evaluation = evaluatePlacement(
        neighbor,
        currentCoil,
        target,
        sourcePositions,
        sourceActivity,
        config
      );

      if (evaluation.score > bestScore) {
        bestScore = evaluation.score;
        currentPlacement = neighbor;
        bestPlacement = neighbor;
        bestEvaluation = evaluation;
        improved = true;
      }
    }

    if (!improved) break;
  }

  return {
    optimalPlacement: bestPlacement,
    electricField: bestEvaluation.electricField,
    targetCoverage: bestEvaluation.coverage,
    focalityIndex: bestEvaluation.focality,
    safetyMargin: bestEvaluation.safety
  };
}

function generateNeighborPlacements(
  base: CoilPlacement,
  positionStep: number,
  angleStep: number
): CoilPlacement[] {
  const neighbors: CoilPlacement[] = [];
  const positionSteps = [-positionStep, 0, positionStep];
  const angleSteps = [-angleStep, 0, angleStep];

  for (const dx of positionSteps) {
    for (const dy of positionSteps) {
      for (const dz of positionSteps) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        
        for (const dAzimuth of angleSteps) {
          for (const dElevation of angleSteps) {
            if (dAzimuth === 0 && dElevation === 0) continue;

            const newOrientation = rotateVector(
              base.orientation,
              [1, 0, 0],
              dElevation * Math.PI / 180
            );
            const finalOrientation = rotateVector(
              newOrientation,
              [0, 0, 1],
              dAzimuth * Math.PI / 180
            );

            neighbors.push({
              position: [
                base.position[0] + dx,
                base.position[1] + dy,
                base.position[2] + dz
              ] as [number, number, number],
              orientation: normalizeVector(finalOrientation) as [number, number, number],
              rotationAngle: (base.rotationAngle + angleStep) % 360,
              coilModelId: base.coilModelId
            });
          }
        }
      }
    }
  }

  return neighbors;
}

export function calculateStimulationParameters(
  electricField: ElectricFieldResult,
  target: StimulationTarget,
  pattern: StimulationPattern,
  pulseSchemes: Record<StimulationPattern, PulseScheme>
): {
  stimulationIntensity: number;
  pulseFrequency: number;
  pulseDuration: number;
  interPulseInterval: number;
  totalPulses: number;
  estimatedDuration: number;
  tissueHeating: number;
} {
  const scheme = pulseSchemes[pattern];
  const targetEF = electricField.maximumEF;
  
  const intensityRatio = Math.min(1, target.intensity / (targetEF * 1e3));
  const stimulationIntensity = Math.round(scheme.intensity * intensityRatio / 5) * 5;

  const pulseFrequency = scheme.frequency;
  const pulseDuration = scheme.pulseDuration;
  const interPulseInterval = 1000 / pulseFrequency - pulseDuration;
  
  const totalPulses = scheme.trainsPerSession * scheme.pulsesPerTrain;
  const trainDuration = scheme.pulsesPerTrain * interPulseInterval;
  const sessionDuration = 
    scheme.trainsPerSession * trainDuration + 
    (scheme.trainsPerSession - 1) * scheme.interTrainInterval * 1000;

  const tissueHeating = calculateTissueHeating(
    electricField,
    pulseFrequency,
    pulseDuration,
    sessionDuration / 1000
  );

  return {
    stimulationIntensity: Math.min(120, Math.max(60, stimulationIntensity)),
    pulseFrequency,
    pulseDuration,
    interPulseInterval,
    totalPulses,
    estimatedDuration: sessionDuration / 60,
    tissueHeating
  };
}

function calculateTissueHeating(
  electricField: ElectricFieldResult,
  frequency: number,
  pulseDuration: number,
  duration: number
): number {
  const sigma = 0.33;
  const rho = 1040;
  const c = 3600;
  
  const meanE2 = electricField.eFieldMagnitude.reduce(
    (sum, e) => sum + e * e, 0
  ) / electricField.eFieldMagnitude.length;

  const SAR = (sigma * meanE2) / (rho * 1e6);
  const dutyCycle = frequency * pulseDuration * 1e-3;
  const averageSAR = SAR * dutyCycle;
  
  const deltaT = (averageSAR * duration) / c;
  
  return deltaT;
}

export function generateRecommendation(
  historicalResults: HistoricalResult[],
  postStimulationEffects: PostStimulationEffect[],
  targetRegion: string,
  pulseSchemes: Record<StimulationPattern, PulseScheme>
): RecommendationResult {
  const regionResults = historicalResults.filter(
    r => r.targetRegion === targetRegion
  );

  if (regionResults.length === 0) {
    const defaultScheme = pulseSchemes.rTMS;
    return {
      recommendedOrientation: [0, 0, 1],
      recommendedPulseScheme: defaultScheme,
      confidenceScore: 0.5,
      expectedFocality: 0.6,
      expectedCoverage: 0.7,
      rationale: '无历史数据，采用标准rTMS方案。建议线圈垂直于皮层表面，采用10Hz频率，80%运动阈值强度。',
      alternatives: [
        {
          orientation: [0, 0, 1],
          pulseScheme: pulseSchemes.iTBS,
          confidenceScore: 0.4
        },
        {
          orientation: [0, 0, 1],
          pulseScheme: pulseSchemes.theta_burst,
          confidenceScore: 0.35
        }
      ]
    };
  }

  const weightedResults = regionResults.map(r => {
    const recency = Math.exp(-(Date.now() - r.date.getTime()) / (30 * 24 * 60 * 60 * 1000));
    const outcomeWeight = r.clinicalOutcome / 100;
    return {
      ...r,
      weight: recency * outcomeWeight
    };
  });

  let totalWeight = 0;
  let avgOrientation: [number, number, number] = [0, 0, 0];
  let avgFocality = 0;
  let avgCoverage = 0;

  for (const r of weightedResults) {
    totalWeight += r.weight;
    avgOrientation[0] += r.coilOrientation[0] * r.weight;
    avgOrientation[1] += r.coilOrientation[1] * r.weight;
    avgOrientation[2] += r.coilOrientation[2] * r.weight;
    avgFocality += r.focalityIndex * r.weight;
    avgCoverage += r.coverageIndex * r.weight;
  }

  if (totalWeight > 0) {
    avgOrientation[0] /= totalWeight;
    avgOrientation[1] /= totalWeight;
    avgOrientation[2] /= totalWeight;
    avgFocality /= totalWeight;
    avgCoverage /= totalWeight;
  }

  avgOrientation = normalizeVector(avgOrientation) as [number, number, number];

  const patternScores: Record<StimulationPattern, number> = {
    rTMS: 0,
    iTBS: 0,
    cTBS: 0,
    paired_pulse: 0,
    theta_burst: 0
  };

  for (const r of weightedResults) {
    patternScores[r.pulseScheme.pattern] += r.weight;
  }

  const bestPattern = Object.entries(patternScores).reduce(
    (best, [pattern, score]) => score > patternScores[best] ? pattern as StimulationPattern : best,
    'rTMS' as StimulationPattern
  );

  const bestScheme = { ...pulseSchemes[bestPattern] };
  
  const avgOutcome = regionResults.reduce(
    (sum, r) => sum + r.clinicalOutcome, 0
  ) / regionResults.length;

  if (avgOutcome < 50) {
    bestScheme.intensity = Math.min(120, bestScheme.intensity + 10);
  }

  const sideEffectCount = postStimulationEffects.filter(
    e => e.sideEffects.length > 0
  ).length;
  
  if (sideEffectCount > postStimulationEffects.length * 0.3) {
    bestScheme.intensity = Math.max(60, bestScheme.intensity - 10);
  }

  const confidenceScore = Math.min(0.95, 0.5 + totalWeight * 0.1);

  const alternatives = Object.entries(pulseSchemes)
    .filter(([pattern]) => pattern !== bestPattern)
    .map(([pattern, scheme]) => ({
      orientation: avgOrientation,
      pulseScheme: scheme,
      confidenceScore: patternScores[pattern as StimulationPattern] / Math.max(1, totalWeight)
    }))
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 2);

  const rationale = generateRationale(
    historicalResults,
    postStimulationEffects,
    bestPattern,
    avgOutcome,
    sideEffectCount
  );

  return {
    recommendedOrientation: avgOrientation,
    recommendedPulseScheme: bestScheme,
    confidenceScore,
    expectedFocality: Math.min(0.95, avgFocality),
    expectedCoverage: Math.min(0.95, avgCoverage),
    rationale,
    alternatives
  };
}

function generateRationale(
  historicalResults: HistoricalResult[],
  postStimulationEffects: PostStimulationEffect[],
  bestPattern: StimulationPattern,
  avgOutcome: number,
  sideEffectCount: number
): string {
  const parts: string[] = [];
  
  parts.push(`基于${historicalResults.length}次历史定位结果分析。`);
  
  if (avgOutcome >= 70) {
    parts.push(`历史临床效果良好（平均${avgOutcome.toFixed(0)}分），推荐维持${bestPattern}模式。`);
  } else if (avgOutcome >= 50) {
    parts.push(`历史临床效果中等（平均${avgOutcome.toFixed(0)}分），建议调整强度参数。`);
  } else {
    parts.push(`历史临床效果一般（平均${avgOutcome.toFixed(0)}分），已增加刺激强度并建议考虑更换方案。`);
  }

  if (sideEffectCount > 0) {
    parts.push(`记录到${sideEffectCount}次不良反应，已适当降低刺激强度。`);
  }

  const recent = historicalResults
    .filter(r => (Date.now() - r.date.getTime()) < 30 * 24 * 60 * 60 * 1000);
  
  if (recent.length > 0) {
    parts.push(`近30天共进行${recent.length}次治疗，平均聚焦指数${
      (recent.reduce((s, r) => s + r.focalityIndex, 0) / recent.length).toFixed(2)
    }。`);
  }

  return parts.join(' ');
}
