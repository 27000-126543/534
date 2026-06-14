import {
  calculateEuclideanDistance,
  calculateVectorDot,
  normalizeVector,
  calculateMatrixInverse,
  calculateMatrixPseudoinverse,
  calculateCovarianceMatrix,
  calculateMatrixTranspose,
  calculateMatrixMultiply,
  calculateMatrixAdd,
  calculateMatrixScalarMultiply
} from '../../utils/math';
import { calculateResidualError } from '../../utils/eeg';
import { EEGData, CovarianceMatrix, TimeWindowResult } from './types';

export function buildLaplacianMatrix(nSources: number, sourcePositions: number[][]): number[][] {
  const L: number[][] = new Array(nSources);
  for (let i = 0; i < nSources; i++) {
    L[i] = new Array(nSources).fill(0);
  }

  const neighbors: number[][] = new Array(nSources);
  for (let i = 0; i < nSources; i++) {
    neighbors[i] = [];
  }

  for (let i = 0; i < nSources; i++) {
    const distances: { index: number; dist: number }[] = [];
    for (let j = 0; j < nSources; j++) {
      if (i !== j) {
        const dist = calculateEuclideanDistance(sourcePositions[i], sourcePositions[j]);
        distances.push({ index: j, dist });
      }
    }
    distances.sort((a, b) => a.dist - b.dist);
    for (let k = 0; k < Math.min(6, distances.length); k++) {
      neighbors[i].push(distances[k].index);
    }
  }

  for (let i = 0; i < nSources; i++) {
    const degree = neighbors[i].length;
    L[i][i] = degree;
    for (const j of neighbors[i]) {
      L[i][j] = -1;
    }
  }

  return L;
}

export function buildDepthWeightingMatrix(
  nSources: number,
  sourcePositions: number[][],
  leadfield: number[][],
  exponent: number = 0.5
): number[][] {
  const W: number[][] = new Array(nSources);
  for (let i = 0; i < nSources; i++) {
    W[i] = new Array(nSources).fill(0);
  }

  for (let i = 0; i < nSources; i++) {
    let norm = 0;
    for (let e = 0; e < leadfield.length; e++) {
      norm += leadfield[e][i] * leadfield[e][i];
    }
    const depth = Math.sqrt(calculateVectorDot(sourcePositions[i], sourcePositions[i]));
    const depthFactor = Math.pow(depth / 72, exponent);
    W[i][i] = 1 / (Math.sqrt(norm) * depthFactor + 1e-10);
  }

  return W;
}

export function computeCovarianceMatrix(
  eegData: EEGData,
  regularization: number = 0.01
): CovarianceMatrix {
  const nChannels = eegData.channels.length;
  const nTimePoints = eegData.data[0]?.length || 0;

  const dataMatrix: number[][] = new Array(nChannels);
  for (let i = 0; i < nChannels; i++) {
    dataMatrix[i] = [...eegData.data[i]];
  }

  const C = calculateCovarianceMatrix(dataMatrix);

  const trace = C.reduce((sum, row) => sum + row[row], 0);
  const lambda = regularization * trace / nChannels;

  for (let i = 0; i < nChannels; i++) {
    C[i][i] += lambda;
  }

  return {
    matrix: C,
    channels: eegData.channels,
    regularization: lambda
  };
}

export function computeCrossSpectralDensity(
  eegData: EEGData,
  frequencyRange: [number, number],
  timeWindow: number,
  overlap: number
): number[][] {
  const nChannels = eegData.channels.length;
  const windowSamples = Math.floor(timeWindow * eegData.samplingRate / 1000);
  const overlapSamples = Math.floor(overlap * eegData.samplingRate / 1000);
  const step = windowSamples - overlapSamples;

  const CSD: number[][] = new Array(nChannels);
  for (let i = 0; i < nChannels; i++) {
    CSD[i] = new Array(nChannels).fill(0);
  }

  let windowCount = 0;
  for (let start = 0; start + windowSamples <= eegData.data[0].length; start += step) {
    const windowData: number[][] = new Array(nChannels);
    for (let i = 0; i < nChannels; i++) {
      windowData[i] = eegData.data[i].slice(start, start + windowSamples);
    }

    const filtered = bandpassFilter(windowData, eegData.samplingRate, frequencyRange[0], frequencyRange[1]);
    const windowCov = calculateCovarianceMatrix(filtered);

    for (let i = 0; i < nChannels; i++) {
      for (let j = 0; j < nChannels; j++) {
        CSD[i][j] += windowCov[i][j];
      }
    }
    windowCount++;
  }

  if (windowCount > 0) {
    for (let i = 0; i < nChannels; i++) {
      for (let j = 0; j < nChannels; j++) {
        CSD[i][j] /= windowCount;
      }
    }
  }

  return CSD;
}

function bandpassFilter(data: number[][], samplingRate: number, lowFreq: number, highFreq: number): number[][] {
  const result: number[][] = [];
  const n = data[0]?.length || 0;

  for (const channel of data) {
    const filtered: number[] = new Array(n).fill(0);
    const lowWn = 2 * lowFreq / samplingRate;
    const highWn = 2 * highFreq / samplingRate;

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let k = Math.max(0, i - 5); k <= Math.min(n - 1, i + 5); k++) {
        const dist = Math.abs(i - k);
        const lowPass = dist === 0 ? lowWn : Math.sin(Math.PI * lowWn * dist) / (Math.PI * dist);
        const highPass = dist === 0 ? highWn : Math.sin(Math.PI * highWn * dist) / (Math.PI * dist);
        const kernel = highPass - lowPass;
        const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * k / n);
        sum += channel[k] * kernel * window;
      }
      filtered[i] = sum;
    }
    result.push(filtered);
  }

  return result;
}

export function solveLORETA(
  leadfield: number[][],
  eegData: number[],
  sourcePositions: number[][],
  params: {
    regularizationParam: number;
    laplacianWeight: number;
    depthWeighting: boolean;
    depthWeightingExponent: number;
  }
): {
  sourceActivity: number[];
  residualError: number;
  regularizationParam: number;
} {
  const nChannels = leadfield.length;
  const nSources = leadfield[0].length;

  const L = buildLaplacianMatrix(nSources, sourcePositions);
  const LtL = calculateMatrixMultiply(calculateMatrixTranspose(L), L);

  const GtG = calculateMatrixMultiply(calculateMatrixTranspose(leadfield), leadfield);

  let W: number[][] | null = null;
  if (params.depthWeighting) {
    W = buildDepthWeightingMatrix(nSources, sourcePositions, leadfield, params.depthWeightingExponent);
  }

  const identity: number[][] = new Array(nSources);
  for (let i = 0; i < nSources; i++) {
    identity[i] = new Array(nSources).fill(0);
    identity[i][i] = 1;
  }

  let regularizer = calculateMatrixAdd(
    calculateMatrixScalarMultiply(LtL, params.laplacianWeight),
    calculateMatrixScalarMultiply(identity, params.regularizationParam)
  );

  if (W) {
    regularizer = calculateMatrixMultiply(
      calculateMatrixMultiply(calculateMatrixTranspose(W), regularizer),
      W
    );
  }

  const A = calculateMatrixAdd(GtG, regularizer);
  const A_inv = calculateMatrixPseudoinverse(A);

  let inverseOperator = calculateMatrixMultiply(A_inv, calculateMatrixTranspose(leadfield));
  if (W) {
    inverseOperator = calculateMatrixMultiply(W, inverseOperator);
  }

  const sourceActivity = new Array(nSources);
  for (let i = 0; i < nSources; i++) {
    sourceActivity[i] = 0;
    for (let j = 0; j < nChannels; j++) {
      sourceActivity[i] += inverseOperator[i][j] * eegData[j];
    }
  }

  const predicted = new Array(nChannels);
  for (let i = 0; i < nChannels; i++) {
    predicted[i] = 0;
    for (let j = 0; j < nSources; j++) {
      predicted[i] += leadfield[i][j] * sourceActivity[j];
    }
  }

  const residualError = calculateResidualError(eegData, predicted);

  return {
    sourceActivity,
    residualError,
    regularizationParam: params.regularizationParam
  };
}

export function solveSLORETA(
  leadfield: number[][],
  eegData: number[],
  sourcePositions: number[][],
  params: {
    regularizationParam: number;
    laplacianWeight: number;
    depthWeighting: boolean;
    depthWeightingExponent: number;
    standardize: boolean;
  }
): {
  sourceActivity: number[];
  residualError: number;
  regularizationParam: number;
} {
  const result = solveLORETA(leadfield, eegData, sourcePositions, params);

  if (params.standardize && params.standardize !== false) {
    const nSources = result.sourceActivity.length;
    const L = buildLaplacianMatrix(nSources, sourcePositions);
    const LtL = calculateMatrixMultiply(calculateMatrixTranspose(L), L);

    const identity: number[][] = new Array(nSources);
    for (let i = 0; i < nSources; i++) {
      identity[i] = new Array(nSources).fill(0);
      identity[i][i] = 1;
    }

    const GtG = calculateMatrixMultiply(calculateMatrixTranspose(leadfield), leadfield);
    const regularizer = calculateMatrixAdd(
      calculateMatrixScalarMultiply(LtL, params.laplacianWeight),
      calculateMatrixScalarMultiply(identity, params.regularizationParam)
    );
    const A = calculateMatrixAdd(GtG, regularizer);
    const A_inv = calculateMatrixPseudoinverse(A);

    const standardization = new Array(nSources);
    for (let i = 0; i < nSources; i++) {
      let sum = 0;
      for (let e = 0; e < leadfield.length; e++) {
        for (let j = 0; j < nSources; j++) {
          sum += leadfield[e][i] * A_inv[i][j] * leadfield[e][j];
        }
      }
      standardization[i] = 1 / Math.sqrt(Math.abs(sum) + 1e-10);
      result.sourceActivity[i] *= standardization[i];
    }
  }

  return result;
}

export function solveBeamforming(
  leadfield: number[][],
  covariance: number[][],
  sourcePositions: number[][],
  params: {
    regularizationParam: number;
    diagonalLoading: number;
  }
): {
  sourceActivity: number[];
  residualError: number;
  regularizationParam: number;
} {
  const nChannels = leadfield.length;
  const nSources = leadfield[0].length;

  const C_inv = calculateMatrixInverse(covariance);

  const sourceActivity = new Array(nSources).fill(0);

  for (let s = 0; s < nSources; s++) {
    const leadFieldColumn = new Array(nChannels);
    for (let e = 0; e < nChannels; e++) {
      leadFieldColumn[e] = leadfield[e][s];
    }

    const CtL = new Array(nChannels);
    for (let i = 0; i < nChannels; i++) {
      CtL[i] = 0;
      for (let j = 0; j < nChannels; j++) {
        CtL[i] += C_inv[i][j] * leadFieldColumn[j];
      }
    }

    let denominator = 0;
    for (let i = 0; i < nChannels; i++) {
      denominator += leadFieldColumn[i] * CtL[i];
    }

    if (Math.abs(denominator) > 1e-10) {
      for (let i = 0; i < nChannels; i++) {
        CtL[i] /= denominator;
      }

      let power = 0;
      for (let i = 0; i < nChannels; i++) {
        for (let j = 0; j < nChannels; j++) {
          power += CtL[i] * covariance[i][j] * CtL[j];
        }
      }
      sourceActivity[s] = Math.sqrt(Math.abs(power));
    }
  }

  return {
    sourceActivity,
    residualError: 0,
    regularizationParam: params.regularizationParam
  };
}

export function solveMNLS(
  leadfield: number[][],
  eegData: number[],
  params: {
    regularizationParam: number;
    maxIterations: number;
    convergenceThreshold: number;
    l1Ratio: number;
  }
): {
  sourceActivity: number[];
  residualError: number;
  regularizationParam: number;
  iterations: number;
} {
  const nChannels = leadfield.length;
  const nSources = leadfield[0].length;

  let sourceActivity = new Array(nSources).fill(0);
  let prevActivity = new Array(nSources).fill(0);

  const GtG = calculateMatrixMultiply(calculateMatrixTranspose(leadfield), leadfield);
  const GtY = new Array(nSources);
  for (let i = 0; i < nSources; i++) {
    GtY[i] = 0;
    for (let j = 0; j < nChannels; j++) {
      GtY[i] += leadfield[j][i] * eegData[j];
    }
  }

  let iteration = 0;
  let converged = false;

  while (iteration < params.maxIterations && !converged) {
    const W: number[][] = new Array(nSources);
    for (let i = 0; i < nSources; i++) {
      W[i] = new Array(nSources).fill(0);
      const absX = Math.abs(sourceActivity[i]) + 1e-10;
      W[i][i] = params.l1Ratio / absX + (1 - params.l1Ratio);
    }

    const regularizer = calculateMatrixScalarMultiply(W, params.regularizationParam);
    const A = calculateMatrixAdd(GtG, regularizer);
    const A_inv = calculateMatrixPseudoinverse(A);

    prevActivity = [...sourceActivity];
    for (let i = 0; i < nSources; i++) {
      sourceActivity[i] = 0;
      for (let j = 0; j < nSources; j++) {
        sourceActivity[i] += A_inv[i][j] * GtY[j];
      }
    }

    let maxDiff = 0;
    for (let i = 0; i < nSources; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(sourceActivity[i] - prevActivity[i]));
    }

    if (maxDiff < params.convergenceThreshold) {
      converged = true;
    }
    iteration++;
  }

  const predicted = new Array(nChannels);
  for (let i = 0; i < nChannels; i++) {
    predicted[i] = 0;
    for (let j = 0; j < nSources; j++) {
      predicted[i] += leadfield[i][j] * sourceActivity[j];
    }
  }

  const residualError = calculateResidualError(eegData, predicted);

  return {
    sourceActivity,
    residualError,
    regularizationParam: params.regularizationParam,
    iterations: iteration
  };
}

export function solveDICS(
  leadfield: number[][],
  csd: number[][],
  sourcePositions: number[][],
  params: {
    regularizationParam: number;
  }
): {
  sourceActivity: number[];
  residualError: number;
  regularizationParam: number;
} {
  return solveBeamforming(leadfield, csd, sourcePositions, {
    regularizationParam: params.regularizationParam,
    diagonalLoading: 0.01
  });
}

export function fitDipole(
  leadfield: number[][],
  eegData: number[],
  sourcePositions: number[][],
  sourceActivity: number[]
): {
  position: [number, number, number];
  moment: [number, number, number];
  goodnessOfFit: number;
  residualError: number;
} {
  let maxIdx = 0;
  let maxVal = Math.abs(sourceActivity[0]);
  for (let i = 1; i < sourceActivity.length; i++) {
    const absVal = Math.abs(sourceActivity[i]);
    if (absVal > maxVal) {
      maxVal = absVal;
      maxIdx = i;
    }
  }

  const position: [number, number, number] = [
    sourcePositions[maxIdx][0],
    sourcePositions[maxIdx][1],
    sourcePositions[maxIdx][2]
  ];

  const nChannels = eegData.length;
  const nSources = sourcePositions.length;

  const leadColumn = new Array(nChannels);
  for (let e = 0; e < nChannels; e++) {
    leadColumn[e] = leadfield[e][maxIdx];
  }

  let momentMagnitude = 0;
  let normLead = 0;
  for (let e = 0; e < nChannels; e++) {
    momentMagnitude += leadColumn[e] * eegData[e];
    normLead += leadColumn[e] * leadColumn[e];
  }
  if (normLead > 1e-10) {
    momentMagnitude /= normLead;
  }

  const sourceNormal = normalizeVector([
    position[0],
    position[1],
    position[2]
  ]);

  const moment: [number, number, number] = [
    sourceNormal[0] * momentMagnitude * 1e9,
    sourceNormal[1] * momentMagnitude * 1e9,
    sourceNormal[2] * momentMagnitude * 1e9
  ];

  const predicted = new Array(nChannels);
  for (let e = 0; e < nChannels; e++) {
    predicted[e] = leadColumn[e] * momentMagnitude;
  }

  const residualError = calculateResidualError(eegData, predicted);
  const goodnessOfFit = 100 - residualError;

  return {
    position,
    moment,
    goodnessOfFit: Math.max(0, Math.min(100, goodnessOfFit)),
    residualError
  };
}

export function computeConfidenceEllipsoid(
  sourceActivity: number[][],
  sourcePositions: number[][],
  confidenceLevel: number = 0.95
): {
  center: [number, number, number];
  radii: [number, number, number];
  rotation: number[][];
  confidenceLevel: number;
  unit: string;
} {
  const nTimePoints = sourceActivity.length;
  const nSources = sourcePositions.length;

  const centers: number[][] = [];
  for (let t = 0; t < nTimePoints; t++) {
    let totalActivity = 0;
    let centerX = 0, centerY = 0, centerZ = 0;
    
    for (let s = 0; s < nSources; s++) {
      const activity = Math.abs(sourceActivity[t][s]);
      totalActivity += activity;
      centerX += sourcePositions[s][0] * activity;
      centerY += sourcePositions[s][1] * activity;
      centerZ += sourcePositions[s][2] * activity;
    }
    
    if (totalActivity > 0) {
      centers.push([
        centerX / totalActivity,
        centerY / totalActivity,
        centerZ / totalActivity
      ]);
    }
  }

  if (centers.length === 0) {
    return {
      center: [0, 0, 0],
      radii: [0, 0, 0],
      rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      confidenceLevel,
      unit: 'mm'
    };
  }

  let meanX = 0, meanY = 0, meanZ = 0;
  for (const c of centers) {
    meanX += c[0];
    meanY += c[1];
    meanZ += c[2];
  }
  meanX /= centers.length;
  meanY /= centers.length;
  meanZ /= centers.length;

  const cov: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];

  for (const c of centers) {
    const dx = c[0] - meanX;
    const dy = c[1] - meanY;
    const dz = c[2] - meanZ;
    
    cov[0][0] += dx * dx;
    cov[0][1] += dx * dy;
    cov[0][2] += dx * dz;
    cov[1][0] += dy * dx;
    cov[1][1] += dy * dy;
    cov[1][2] += dy * dz;
    cov[2][0] += dz * dx;
    cov[2][1] += dz * dy;
    cov[2][2] += dz * dz;
  }

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      cov[i][j] /= centers.length;
    }
  }

  const { eigenvalues, eigenvectors } = computeEigenDecomposition3x3(cov);
  
  const chiSquare = 7.815;
  const radii: [number, number, number] = [
    Math.sqrt(eigenvalues[0] * chiSquare),
    Math.sqrt(eigenvalues[1] * chiSquare),
    Math.sqrt(eigenvalues[2] * chiSquare)
  ];

  return {
    center: [meanX, meanY, meanZ],
    radii,
    rotation: eigenvectors,
    confidenceLevel,
    unit: 'mm'
  };
}

function computeEigenDecomposition3x3(matrix: number[][]): {
  eigenvalues: number[];
  eigenvectors: number[][];
} {
  const m = matrix;
  
  const trace = m[0][0] + m[1][1] + m[2][2];
  const det = 
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  
  const minorSum = 
    (m[0][0] * m[1][1] - m[0][1] * m[1][0]) +
    (m[1][1] * m[2][2] - m[1][2] * m[2][1]) +
    (m[0][0] * m[2][2] - m[0][2] * m[2][0]);

  const a = 1;
  const b = -trace;
  const c = minorSum;
  const d = -det;

  const f = ((3 * c / a) - (b * b) / (a * a)) / 3;
  const g = ((2 * b * b * b) / (a * a * a) - (9 * b * c) / (a * a) + (27 * d) / a) / 27;
  const h = (g * g) / 4 + (f * f * f) / 27;

  let eigenvalues: number[];
  
  if (h > 0) {
    const R = -(g / 2) + Math.sqrt(h);
    const S = Math.cbrt(R);
    const T = -(g / 2) - Math.sqrt(h);
    const U = Math.cbrt(T);
    
    eigenvalues = [
      (S + U) - (b / (3 * a)),
      -(S + U) / 2 - (b / (3 * a)) + (Math.sqrt(3) * (S - U) / 2),
      -(S + U) / 2 - (b / (3 * a)) - (Math.sqrt(3) * (S - U) / 2)
    ];
  } else {
    const i = Math.sqrt((g * g) / 4 - h);
    const j = Math.cbrt(i);
    const k = Math.acos(-g / (2 * i));
    const L = -j;
    const M = Math.cos(k / 3);
    const N = Math.sqrt(3) * Math.sin(k / 3);
    const P = -(b / (3 * a));
    
    eigenvalues = [
      2 * j * M + P,
      L * (M + N) + P,
      L * (M - N) + P
    ];
  }

  eigenvalues.sort((x, y) => y - x);

  const eigenvectors: number[][] = [];
  for (const lambda of eigenvalues) {
    const A: number[][] = [
      [m[0][0] - lambda, m[0][1], m[0][2]],
      [m[1][0], m[1][1] - lambda, m[1][2]],
      [m[2][0], m[2][1], m[2][2] - lambda]
    ];

    const v = solveHomogeneous3x3(A);
    eigenvectors.push(v);
  }

  return { eigenvalues, eigenvectors };
}

function solveHomogeneous3x3(A: number[][]): number[] {
  const det = 
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  if (Math.abs(det) < 1e-10) {
    const cross = [
      A[1][0] * A[2][1] - A[1][1] * A[2][0],
      A[1][1] * A[2][0] - A[1][0] * A[2][1],
      A[1][0] * A[2][1] - A[1][1] * A[2][0]
    ];
    
    const norm = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
    if (norm > 1e-10) {
      return [cross[0] / norm, cross[1] / norm, cross[2] / norm];
    }
  }

  for (let i = 0; i < 3; i++) {
    const v = new Array(3).fill(0);
    v[i] = 1;
    
    for (let j = 0; j < 3; j++) {
      if (j !== i) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          if (k !== i) {
            sum += A[j][k] * v[k];
          }
        }
        if (Math.abs(A[j][i]) > 1e-10) {
          v[j] = -sum / A[j][i];
        }
      }
    }
    
    const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (norm > 1e-10) {
      return [v[0] / norm, v[1] / norm, v[2] / norm];
    }
  }

  return [1, 0, 0];
}

export function computeSourceCenter(
  sourceActivity: number[],
  sourcePositions: number[][]
): [number, number, number] {
  let totalActivity = 0;
  let centerX = 0, centerY = 0, centerZ = 0;

  for (let s = 0; s < sourceActivity.length; s++) {
    const activity = Math.abs(sourceActivity[s]);
    totalActivity += activity;
    centerX += sourcePositions[s][0] * activity;
    centerY += sourcePositions[s][1] * activity;
    centerZ += sourcePositions[s][2] * activity;
  }

  if (totalActivity > 0) {
    return [
      centerX / totalActivity,
      centerY / totalActivity,
      centerZ / totalActivity
    ];
  }

  return [0, 0, 0];
}
