export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配');
  }
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

export function vectorNorm(v: number[]): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

export function normalizeVector(v: number[]): number[] {
  const norm = vectorNorm(v);
  if (norm === 0) return v;
  return v.map(val => val / norm);
}

export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配');
  }
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

export function crossProduct(a: number[], b: number[]): number[] {
  if (a.length !== 3 || b.length !== 3) {
    throw new Error('叉积仅支持3维向量');
  }
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

export function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;
  
  if (colsA !== rowsB) {
    throw new Error('矩阵维度不匹配');
  }
  
  const result: number[][] = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));
  
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  
  return result;
}

export function transposeMatrix(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0].length;
  const result: number[][] = Array(cols).fill(null).map(() => Array(rows).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = A[i][j];
    }
  }
  
  return result;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function std(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - m, 2));
  return Math.sqrt(mean(squaredDiffs));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function covarianceMatrix(data: number[][]): number[][] {
  const n = data.length;
  const m = data[0].length;
  const means = Array(m).fill(0).map((_, j) => mean(data.map(row => row[j])));
  
  const centered = data.map(row => row.map((val, j) => val - means[j]));
  const cov: number[][] = Array(m).fill(null).map(() => Array(m).fill(0));
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      cov[i][j] = centered.reduce((sum, row) => sum + row[i] * row[j], 0) / (n - 1);
    }
  }
  
  return cov;
}

export function gaussian(x: number, mu: number = 0, sigma: number = 1): number {
  return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
}

export function linspace(start: number, end: number, n: number): number[] {
  if (n <= 1) return [start];
  const step = (end - start) / (n - 1);
  return Array(n).fill(0).map((_, i) => start + i * step);
}

export function zeros(rows: number, cols?: number): number[] | number[][] {
  if (cols === undefined) {
    return Array(rows).fill(0);
  }
  return Array(rows).fill(null).map(() => Array(cols).fill(0));
}

export function ones(rows: number, cols?: number): number[] | number[][] {
  if (cols === undefined) {
    return Array(rows).fill(1);
  }
  return Array(rows).fill(null).map(() => Array(cols).fill(1));
}

export function eye(n: number): number[][] {
  const result: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    result[i][i] = 1;
  }
  return result;
}

export function clip(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function rotationMatrixToEulerAngles(R: number[][]): { roll: number; pitch: number; yaw: number } {
  const sy = Math.sqrt(R[0][0] * R[0][0] + R[1][0] * R[1][0]);
  const singular = sy < 1e-6;
  
  let x, y, z;
  if (!singular) {
    x = Math.atan2(R[2][1], R[2][2]);
    y = Math.atan2(-R[2][0], sy);
    z = Math.atan2(R[1][0], R[0][0]);
  } else {
    x = Math.atan2(-R[1][2], R[1][1]);
    y = Math.atan2(-R[2][0], sy);
    z = 0;
  }
  
  return {
    roll: radiansToDegrees(x),
    pitch: radiansToDegrees(y),
    yaw: radiansToDegrees(z)
  };
}

export function eulerAnglesToRotationMatrix(roll: number, pitch: number, yaw: number): number[][] {
  const rollRad = degreesToRadians(roll);
  const pitchRad = degreesToRadians(pitch);
  const yawRad = degreesToRadians(yaw);
  
  const Rx = [
    [1, 0, 0],
    [0, Math.cos(rollRad), -Math.sin(rollRad)],
    [0, Math.sin(rollRad), Math.cos(rollRad)]
  ];
  
  const Ry = [
    [Math.cos(pitchRad), 0, Math.sin(pitchRad)],
    [0, 1, 0],
    [-Math.sin(pitchRad), 0, Math.cos(pitchRad)]
  ];
  
  const Rz = [
    [Math.cos(yawRad), -Math.sin(yawRad), 0],
    [Math.sin(yawRad), Math.cos(yawRad), 0],
    [0, 0, 1]
  ];
  
  return matrixMultiply(Rz, matrixMultiply(Ry, Rx));
}

export function calculateMeshQuality(vertices: number[][], faces: number[][]): number {
  let minQuality = Infinity;
  
  for (const face of faces) {
    const [i, j, k] = face;
    const v0 = vertices[i];
    const v1 = vertices[j];
    const v2 = vertices[k];
    
    const a = euclideanDistance(v0, v1);
    const b = euclideanDistance(v1, v2);
    const c = euclideanDistance(v2, v0);
    
    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    
    const quality = (4 * Math.sqrt(3) * area) / (a * a + b * b + c * c);
    minQuality = Math.min(minQuality, quality);
  }
  
  return minQuality;
}

export function calculateMeshVolume(vertices: number[][], faces: number[][]): number {
  let volume = 0;
  
  for (const face of faces) {
    const [i, j, k] = face;
    const v0 = vertices[i];
    const v1 = vertices[j];
    const v2 = vertices[k];
    
    const scalarTriple = dotProduct(v0, crossProduct(v1, v2));
    volume += scalarTriple;
  }
  
  return Math.abs(volume) / 6;
}
