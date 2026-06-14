import { calculateEuclideanDistance, calculateVectorDot, calculateVectorCross, normalizeVector } from '../../utils/math';
import { BEMModel, ElectrodeData, SourceData, LeadFieldConfig } from './types';

export function calculateSolidAngle(
  point: number[],
  triangle: [number[], number[], number[]],
  outwardNormal: number[]
): number {
  const [v1, v2, v3] = triangle;
  
  const r1 = [v1[0] - point[0], v1[1] - point[1], v1[2] - point[2]];
  const r2 = [v2[0] - point[0], v2[1] - point[1], v2[2] - point[2]];
  const r3 = [v3[0] - point[0], v3[1] - point[1], v3[2] - point[2]];
  
  const nr1 = Math.sqrt(calculateVectorDot(r1, r1));
  const nr2 = Math.sqrt(calculateVectorDot(r2, r2));
  const nr3 = Math.sqrt(calculateVectorDot(r3, r3));
  
  if (nr1 < 1e-10 || nr2 < 1e-10 || nr3 < 1e-10) {
    return 0;
  }
  
  const cross23 = calculateVectorCross(r2, r3);
  const numerator = calculateVectorDot(r1, cross23);
  
  const denominator = nr1 * nr2 * nr3 + 
    nr1 * calculateVectorDot(r2, r3) + 
    nr2 * calculateVectorDot(r3, r1) + 
    nr3 * calculateVectorDot(r1, r2);
  
  let omega = 2 * Math.atan2(numerator, denominator);
  
  const toPoint = normalizeVector(point);
  const normalDot = calculateVectorDot(toPoint, outwardNormal);
  if (normalDot < 0) {
    omega = -omega;
  }
  
  return omega;
}

export function calculateAnalyticalPotential(
  source: SourceData,
  electrode: ElectrodeData,
  radii: [number, number, number],
  conductivities: [number, number, number]
): number {
  const sourcePos = source.position;
  const elecPos = electrode.position;
  
  const r0 = calculateEuclideanDistance(sourcePos, elecPos);
  
  if (r0 < 1e-10) return 0;
  
  const sourceRadius = Math.sqrt(calculateVectorDot(sourcePos, sourcePos));
  const elecRadius = Math.sqrt(calculateVectorDot(elecPos, elecPos));
  
  if (source.orientation) {
    const dipoleMoment = source.orientation;
    const dipoleMagnitude = Math.sqrt(calculateVectorDot(dipoleMoment, dipoleMoment));
    
    if (dipoleMagnitude < 1e-10) return 0;
    
    const normalizedDipole = normalizeVector(dipoleMoment);
    const elecDirection = normalizeVector(elecPos);
    
    const cosTheta = calculateVectorDot(normalizedDipole, elecDirection);
    
    const [rScalp, rSkull, rBrain] = radii;
    const [sigmaScalp, sigmaSkull, sigmaBrain] = conductivities;
    
    if (sourceRadius <= rBrain && elecRadius >= rScalp) {
      const sigmaRatio1 = sigmaSkull / sigmaBrain;
      const sigmaRatio2 = sigmaScalp / sigmaSkull;
      
      const f1 = (2 * sigmaRatio1 + 1) * (2 * sigmaRatio2 + 1);
      const f2 = (sigmaRatio1 - 1) * (sigmaRatio2 - 1);
      const geomFactor = f1 / (f1 - f2 * Math.pow(rBrain / rScalp, 3));
      
      const potential = (geomFactor * dipoleMagnitude * cosTheta) / 
        (4 * Math.PI * sigmaBrain * r0 * r0);
      
      return potential;
    }
  }
  
  return 1 / (4 * Math.PI * conductivities[2] * r0);
}

export function buildBEMSystemMatrix(
  bemModel: BEMModel,
  electrodes: ElectrodeData[]
): number[][] {
  const nVertices = bemModel.scalp.vertices.length + 
                    bemModel.skull.vertices.length + 
                    bemModel.brain.vertices.length;
  const nElectrodes = electrodes.length;
  
  const matrix: number[][] = new Array(nElectrodes);
  for (let i = 0; i < nElectrodes; i++) {
    matrix[i] = new Array(nVertices).fill(0);
  }
  
  const layers = [
    { mesh: bemModel.brain, conductivity: bemModel.brain.conductivity, isInner: true },
    { mesh: bemModel.skull, conductivity: bemModel.skull.conductivity, isInner: false },
    { mesh: bemModel.scalp, conductivity: bemModel.scalp.conductivity, isInner: false }
  ];
  
  let vertexOffset = 0;
  
  for (const layer of layers) {
    const { mesh, conductivity } = layer;
    
    for (let e = 0; e < nElectrodes; e++) {
      const elecPos = electrodes[e].position;
      
      for (let v = 0; v < mesh.vertices.length; v++) {
        const vertex = mesh.vertices[v];
        const normal = mesh.normals[v];
        
        let solidAngle = 0;
        
        for (const face of mesh.faces) {
          if (face.includes(v)) {
            const triangle: [number[], number[], number[]] = [
              mesh.vertices[face[0]],
              mesh.vertices[face[1]],
              mesh.vertices[face[2]]
            ];
            solidAngle += calculateSolidAngle(elecPos, triangle, normal);
          }
        }
        
        const dist = calculateEuclideanDistance(elecPos, vertex);
        if (dist > 1e-10) {
          matrix[e][vertexOffset + v] = solidAngle / (4 * Math.PI * conductivity * dist);
        }
      }
    }
    
    vertexOffset += mesh.vertices.length;
  }
  
  return matrix;
}

export function calculateLeadFieldColumn(
  source: SourceData,
  electrodes: ElectrodeData[],
  bemModel: BEMModel,
  config: LeadFieldConfig
): number[] {
  const nElectrodes = electrodes.length;
  const leadField: number[] = new Array(nElectrodes).fill(0);
  
  const radii: [number, number, number] = [85, 78, 72];
  const conductivities: [number, number, number] = [
    bemModel.scalp.conductivity,
    bemModel.skull.conductivity,
    bemModel.brain.conductivity
  ];
  
  for (let e = 0; e < nElectrodes; e++) {
    let potential = calculateAnalyticalPotential(
      source,
      electrodes[e],
      radii,
      conductivities
    );
    
    if (config.depthWeighting) {
      const depth = Math.sqrt(calculateVectorDot(source.position, source.position));
      const depthFactor = Math.pow(depth / 72, config.depthWeightingExponent || 0.5);
      potential *= depthFactor;
    }
    
    leadField[e] = potential;
  }
  
  if (config.normalize) {
    const norm = Math.sqrt(leadField.reduce((sum, v) => sum + v * v, 0));
    if (norm > 1e-10) {
      for (let e = 0; e < nElectrodes; e++) {
        leadField[e] /= norm;
      }
    }
  }
  
  return leadField;
}

export function generateLeadFieldMatrix(
  sources: SourceData[],
  electrodes: ElectrodeData[],
  bemModel: BEMModel,
  config: LeadFieldConfig
): number[][] {
  const nElectrodes = electrodes.length;
  const nSources = sources.length;
  
  let nColumns = nSources;
  if (config.sourceOrientation === 'free') {
    nColumns *= 3;
  } else if (config.sourceOrientation === 'loose') {
    nColumns = nSources * 4;
  }
  
  const matrix: number[][] = new Array(nElectrodes);
  for (let i = 0; i < nElectrodes; i++) {
    matrix[i] = new Array(nColumns).fill(0);
  }
  
  for (let s = 0; s < nSources; s++) {
    const source = sources[s];
    
    if (config.sourceOrientation === 'fixed' && source.orientation) {
      const column = calculateLeadFieldColumn(source, electrodes, bemModel, config);
      for (let e = 0; e < nElectrodes; e++) {
        matrix[e][s] = column[e];
      }
    } else if (config.sourceOrientation === 'free') {
      const orientations: [number, number, number][] = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      
      for (let o = 0; o < 3; o++) {
        const orientedSource: SourceData = {
          ...source,
          orientation: orientations[o]
        };
        const column = calculateLeadFieldColumn(orientedSource, electrodes, bemModel, config);
        for (let e = 0; e < nElectrodes; e++) {
          matrix[e][s * 3 + o] = column[e];
        }
      }
    } else if (config.sourceOrientation === 'loose') {
      if (source.orientation) {
        const normalColumn = calculateLeadFieldColumn(source, electrodes, bemModel, config);
        for (let e = 0; e < nElectrodes; e++) {
          matrix[e][s * 4] = normalColumn[e];
        }
      }
      
      const looseWeight = config.looseWeight || 0.2;
      const orientations: [number, number, number][] = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      
      for (let o = 0; o < 3; o++) {
        const orientedSource: SourceData = {
          ...source,
          orientation: orientations[o]
        };
        const column = calculateLeadFieldColumn(orientedSource, electrodes, bemModel, config);
        for (let e = 0; e < nElectrodes; e++) {
          matrix[e][s * 4 + o + 1] = column[e] * looseWeight;
        }
      }
    }
  }
  
  return matrix;
}

export function computeSVD(matrix: number[][]): {
  U: number[][];
  S: number[];
  Vt: number[][];
  conditionNumber: number;
  rank: number;
} {
  const m = matrix.length;
  const n = matrix[0].length;
  
  const AtA: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    AtA[i] = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < m; k++) {
        AtA[i][j] += matrix[k][i] * matrix[k][j];
      }
    }
  }
  
  const eigenvalues = computeEigenvalues(AtA);
  const S = eigenvalues.map(v => Math.sqrt(Math.max(0, v))).sort((a, b) => b - a);
  
  const tol = Math.max(m, n) * S[0] * 1e-10;
  let rank = 0;
  for (const s of S) {
    if (s > tol) rank++;
  }
  
  const conditionNumber = rank > 0 ? S[0] / S[rank - 1] : Infinity;
  
  const U: number[][] = new Array(m);
  for (let i = 0; i < m; i++) {
    U[i] = new Array(rank).fill(0);
  }
  
  const Vt: number[][] = new Array(rank);
  for (let i = 0; i < rank; i++) {
    Vt[i] = new Array(n).fill(0);
  }
  
  return { U, S, Vt, conditionNumber, rank };
}

function computeEigenvalues(matrix: number[][]): number[] {
  const n = matrix.length;
  const a = matrix.map(row => [...row]);
  
  const d = new Array(n).fill(0);
  const e = new Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    d[i] = a[i][i];
  }
  
  for (let i = n - 1; i > 0; i--) {
    let scale = 0;
    for (let k = 0; k < i; k++) {
      scale += Math.abs(a[i][k]);
    }
    
    if (scale === 0) {
      e[i] = a[i][i - 1];
      continue;
    }
    
    const h = 1 / scale;
    let sum = 0;
    for (let k = 0; k < i; k++) {
      a[i][k] *= h;
      sum += a[i][k] * a[i][k];
    }
    
    const f = a[i][i - 1];
    const g = f > 0 ? -Math.sqrt(sum) : Math.sqrt(sum);
    e[i] = scale * g;
    const hh = 1 / (sum - f * g);
    a[i][i - 1] = f - g;
    
    const b = new Array(i).fill(0);
    for (let j = 0; j < i; j++) {
      b[j] = a[j][i] = a[i][j] * hh;
    }
    
    for (let j = 0; j < i; j++) {
      let sum2 = 0;
      for (let k = 0; k <= j; k++) {
        sum2 += a[j][k] * a[i][k];
      }
      for (let k = j + 1; k < i; k++) {
        sum2 += a[k][j] * a[i][k];
      }
      b[j] = sum2 * hh;
    }
    
    let sum3 = 0;
    for (let k = 0; k < i; k++) {
      sum3 += a[i][k] * b[k];
    }
    
    const hh2 = sum3 * hh / 2;
    for (let j = 0; j < i; j++) {
      const b2 = b[j] - hh2 * a[i][j];
      for (let k = 0; k <= j; k++) {
        a[j][k] -= (a[i][j] * b[k] + b2 * a[i][k]);
      }
    }
    
    d[i] = a[i][i];
  }
  
  d[0] = a[0][0];
  e[0] = 0;
  
  return d.map((v, i) => Math.max(0, v + e[i]));
}

export function checkMatrixConditioning(
  matrix: number[][],
  threshold: number = 1e6
): {
  isWellConditioned: boolean;
  conditionNumber: number;
  rank: number;
  maxSingularValue: number;
  minSingularValue: number;
} {
  const svd = computeSVD(matrix);
  
  const validSingularValues = svd.S.filter(s => s > 1e-10);
  const maxS = Math.max(...svd.S);
  const minS = Math.min(...validSingularValues);
  
  return {
    isWellConditioned: svd.conditionNumber < threshold,
    conditionNumber: svd.conditionNumber,
    rank: svd.rank,
    maxSingularValue: maxS,
    minSingularValue: minS
  };
}
