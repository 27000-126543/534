import { MeshData, MeshQualityMetrics, Vertex3D } from './types';
import {
  calculateEuclideanDistance,
  calculateTriangleArea,
  calculateVectorNormal,
  normalizeVector,
  calculateVectorCross,
  calculateVectorDot,
  calculateMatrixDeterminant3x3
} from '../../utils/math';

export function generateSphereMesh(radius: number, subdivisions: number): MeshData {
  const vertices: number[][] = [];
  const faces: number[][] = [];
  
  const phi = Math.PI * (3 - Math.sqrt(5));
  
  for (let i = 0; i < subdivisions; i++) {
    const y = 1 - (i / (subdivisions - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;
    
    for (let j = 0; j < subdivisions; j++) {
      const x = Math.cos(theta + j * 0.1) * radiusAtY;
      const z = Math.sin(theta + j * 0.1) * radiusAtY;
      vertices.push([x * radius, y * radius, z * radius]);
    }
  }
  
  for (let i = 0; i < subdivisions - 1; i++) {
    for (let j = 0; j < subdivisions; j++) {
      const a = i * subdivisions + j;
      const b = i * subdivisions + ((j + 1) % subdivisions);
      const c = (i + 1) * subdivisions + ((j + 1) % subdivisions);
      const d = (i + 1) * subdivisions + j;
      
      faces.push([a, b, c]);
      faces.push([a, c, d]);
    }
  }
  
  return { vertices, faces };
}

export function generateEllipsoidMesh(
  center: number[],
  radii: number[],
  subdivisions: number
): MeshData {
  const sphere = generateSphereMesh(1, subdivisions);
  
  const vertices = sphere.vertices.map(v => [
    center[0] + v[0] * radii[0],
    center[1] + v[1] * radii[1],
    center[2] + v[2] * radii[2]
  ]);
  
  return { vertices, faces: sphere.faces };
}

export function generateThreeLayerHeadModel(
  headCenter: number[],
  headRadius: number,
  resolution: 'coarse' | 'medium' | 'fine' = 'medium'
): {
  scalp: MeshData;
  skull: MeshData;
  brain: MeshData;
} {
  const subdivisions = {
    coarse: 12,
    medium: 20,
    fine: 32
  }[resolution];
  
  const scalp = generateEllipsoidMesh(
    headCenter,
    [headRadius, headRadius * 0.95, headRadius],
    subdivisions
  );
  
  const skull = generateEllipsoidMesh(
    headCenter,
    [headRadius * 0.92, headRadius * 0.88, headRadius * 0.92],
    Math.floor(subdivisions * 0.9)
  );
  
  const brain = generateEllipsoidMesh(
    headCenter,
    [headRadius * 0.85, headRadius * 0.8, headRadius * 0.85],
    Math.floor(subdivisions * 0.8)
  );
  
  return { scalp, skull, brain };
}

export function calculateMeshQuality(mesh: MeshData): MeshQualityMetrics {
  const { vertices, faces } = mesh;
  
  if (!faces.length) {
    return {
      aspectRatio: { mean: 0, max: 0, min: 0 },
      triangleArea: { mean: 0, max: 0, min: 0, total: 0 },
      interiorAngle: { mean: 0, max: 0, min: 0 },
      qualityScore: 0,
      poorQualityCount: 0
    };
  }
  
  const aspectRatios: number[] = [];
  const areas: number[] = [];
  const angles: number[] = [];
  let poorQualityCount = 0;
  
  for (const face of faces) {
    const v1 = vertices[face[0]];
    const v2 = vertices[face[1]];
    const v3 = vertices[face[2]];
    
    const edge1 = calculateEuclideanDistance(v1, v2);
    const edge2 = calculateEuclideanDistance(v2, v3);
    const edge3 = calculateEuclideanDistance(v3, v1);
    
    const edges = [edge1, edge2, edge3].sort((a, b) => b - a);
    const aspectRatio = edges[0] / edges[2];
    aspectRatios.push(aspectRatio);
    
    if (aspectRatio > 3) {
      poorQualityCount++;
    }
    
    const area = calculateTriangleArea(v1, v2, v3);
    areas.push(area);
    
    const angle1 = calculateInteriorAngle(v1, v2, v3);
    const angle2 = calculateInteriorAngle(v2, v3, v1);
    const angle3 = calculateInteriorAngle(v3, v1, v2);
    angles.push(angle1, angle2, angle3);
  }
  
  const totalArea = areas.reduce((a, b) => a + b, 0);
  
  const qualityScore = calculateQualityScore(
    aspectRatios,
    angles,
    poorQualityCount,
    faces.length
  );
  
  return {
    aspectRatio: {
      mean: calculateMean(aspectRatios),
      max: Math.max(...aspectRatios),
      min: Math.min(...aspectRatios)
    },
    triangleArea: {
      mean: calculateMean(areas),
      max: Math.max(...areas),
      min: Math.min(...areas),
      total: totalArea
    },
    interiorAngle: {
      mean: calculateMean(angles),
      max: Math.max(...angles),
      min: Math.min(...angles)
    },
    qualityScore,
    poorQualityCount
  };
}

function calculateInteriorAngle(p1: number[], p2: number[], p3: number[]): number {
  const v1 = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  const v2 = [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]];
  
  const dot = calculateVectorDot(v1, v2);
  const mag1 = Math.sqrt(calculateVectorDot(v1, v1));
  const mag2 = Math.sqrt(calculateVectorDot(v2, v2));
  
  const cos = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
}

function calculateMean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateQualityScore(
  aspectRatios: number[],
  angles: number[],
  poorQualityCount: number,
  totalFaces: number
): number {
  const poorRatio = poorQualityCount / totalFaces;
  const avgAspectRatio = calculateMean(aspectRatios);
  const avgAngle = calculateMean(angles);
  
  let score = 100;
  
  score -= poorRatio * 50;
  
  if (avgAspectRatio > 2) {
    score -= (avgAspectRatio - 2) * 15;
  }
  
  if (avgAngle < 30 || avgAngle > 120) {
    score -= Math.abs(avgAngle - 60) * 0.5;
  }
  
  return Math.max(0, Math.min(100, score));
}

export function smoothMesh(mesh: MeshData, iterations: number = 5): MeshData {
  let vertices = [...mesh.vertices.map(v => [...v])];
  const faces = [...mesh.faces];
  
  for (let iter = 0; iter < iterations; iter++) {
    const newVertices = vertices.map(v => [...v]);
    const neighborCount = new Array(vertices.length).fill(0);
    const neighborSum = vertices.map(() => [0, 0, 0]);
    
    for (const face of faces) {
      for (let i = 0; i < 3; i++) {
        const vi = face[i];
        const vj = face[(i + 1) % 3];
        
        neighborSum[vi][0] += vertices[vj][0];
        neighborSum[vi][1] += vertices[vj][1];
        neighborSum[vi][2] += vertices[vj][2];
        neighborCount[vi]++;
        
        neighborSum[vj][0] += vertices[vi][0];
        neighborSum[vj][1] += vertices[vi][1];
        neighborSum[vj][2] += vertices[vi][2];
        neighborCount[vj]++;
      }
    }
    
    for (let i = 0; i < vertices.length; i++) {
      if (neighborCount[i] > 0) {
        newVertices[i][0] = neighborSum[i][0] / neighborCount[i];
        newVertices[i][1] = neighborSum[i][1] / neighborCount[i];
        newVertices[i][2] = neighborSum[i][2] / neighborCount[i];
      }
    }
    
    vertices = newVertices;
  }
  
  return { vertices, faces };
}

export function computeMeshNormals(mesh: MeshData): number[][] {
  const { vertices, faces } = mesh;
  const normals: number[][] = new Array(vertices.length).fill(null).map(() => [0, 0, 0]);
  
  for (const face of faces) {
    const v1 = vertices[face[0]];
    const v2 = vertices[face[1]];
    const v3 = vertices[face[2]];
    
    const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
    
    const faceNormal = calculateVectorNormal(
      calculateVectorCross(edge1, edge2)
    );
    
    normals[face[0]][0] += faceNormal[0];
    normals[face[0]][1] += faceNormal[1];
    normals[face[0]][2] += faceNormal[2];
    
    normals[face[1]][0] += faceNormal[0];
    normals[face[1]][1] += faceNormal[1];
    normals[face[1]][2] += faceNormal[2];
    
    normals[face[2]][0] += faceNormal[0];
    normals[face[2]][1] += faceNormal[1];
    normals[face[2]][2] += faceNormal[2];
  }
  
  return normals.map(n => normalizeVector(n));
}

export function findClosestPointOnMesh(
  point: number[],
  mesh: MeshData
): { point: number[]; faceIndex: number; distance: number } {
  let closestPoint: number[] = [0, 0, 0];
  let closestFace = 0;
  let minDistance = Infinity;
  
  for (let i = 0; i < mesh.faces.length; i++) {
    const face = mesh.faces[i];
    const v1 = mesh.vertices[face[0]];
    const v2 = mesh.vertices[face[1]];
    const v3 = mesh.vertices[face[2]];
    
    const projected = projectPointToTriangle(point, v1, v2, v3);
    const dist = calculateEuclideanDistance(point, projected);
    
    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = projected;
      closestFace = i;
    }
  }
  
  return {
    point: closestPoint,
    faceIndex: closestFace,
    distance: minDistance
  };
}

export function projectPointToTriangle(
  point: number[],
  v1: number[],
  v2: number[],
  v3: number[]
): number[] {
  const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
  const v0 = [v1[0] - point[0], v1[1] - point[1], v1[2] - point[2]];
  
  const a = calculateVectorDot(edge1, edge1);
  const b = calculateVectorDot(edge1, edge2);
  const c = calculateVectorDot(edge2, edge2);
  const d = calculateVectorDot(edge1, v0);
  const e = calculateVectorDot(edge2, v0);
  
  const det = a * c - b * b;
  let s = b * e - c * d;
  let t = b * d - a * e;
  
  if (s + t <= det) {
    if (s < 0) {
      s = 0;
      t = e >= 0 ? 0 : (-e > c ? 1 : -e / c);
    } else if (t < 0) {
      t = 0;
      s = d >= 0 ? 0 : (-d > a ? 1 : -d / a);
    } else {
      const invDet = 1 / det;
      s *= invDet;
      t *= invDet;
    }
  } else {
    if (s < 0) {
      s = 0;
      const tmp0 = b + d;
      const tmp1 = c + e;
      if (tmp1 > tmp0) {
        const numer = tmp1 - tmp0;
        const denom = a - 2 * b + c;
        s = numer > denom ? 1 : numer / denom;
        t = 1 - s;
      } else {
        t = tmp1 <= 0 ? 1 : (e >= 0 ? 0 : -e / c);
      }
    } else if (t < 0) {
      t = 0;
      if (a + d > b + e) {
        const numer = c + e - b - d;
        const denom = a - 2 * b + c;
        s = numer > denom ? 1 : numer / denom;
      } else {
        s = d >= 0 ? 0 : (-d > a ? 1 : -d / a);
      }
    } else {
      const numer = c + e - b - d;
      const denom = a - 2 * b + c;
      s = numer > denom ? 1 : numer / denom;
      t = 1 - s;
    }
  }
  
  return [
    v1[0] + s * edge1[0] + t * edge2[0],
    v1[1] + s * edge1[1] + t * edge2[1],
    v1[2] + s * edge1[2] + t * edge2[2]
  ];
}

export function generateRegularSourceGrid(
  brainMesh: MeshData,
  gridSpacing: number = 5
): number[][] {
  const sources: number[][] = [];
  const { vertices, faces } = brainMesh;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  for (const v of vertices) {
    minX = Math.min(minX, v[0]);
    maxX = Math.max(maxX, v[0]);
    minY = Math.min(minY, v[1]);
    maxY = Math.max(maxY, v[1]);
    minZ = Math.min(minZ, v[2]);
    maxZ = Math.max(maxZ, v[2]);
  }
  
  for (let x = minX; x <= maxX; x += gridSpacing) {
    for (let y = minY; y <= maxY; y += gridSpacing) {
      for (let z = minZ; z <= maxZ; z += gridSpacing) {
        const point = [x, y, z];
        if (isPointInsideMesh(point, brainMesh)) {
          sources.push(point);
        }
      }
    }
  }
  
  return sources;
}

export function isPointInsideMesh(point: number[], mesh: MeshData): boolean {
  const direction = [1, 0, 0];
  let intersections = 0;
  
  for (const face of mesh.faces) {
    const v1 = mesh.vertices[face[0]];
    const v2 = mesh.vertices[face[1]];
    const v3 = mesh.vertices[face[2]];
    
    if (rayIntersectsTriangle(point, direction, v1, v2, v3)) {
      intersections++;
    }
  }
  
  return intersections % 2 === 1;
}

export function rayIntersectsTriangle(
  origin: number[],
  direction: number[],
  v0: number[],
  v1: number[],
  v2: number[]
): boolean {
  const EPSILON = 0.0000001;
  
  const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
  const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
  
  const h = calculateVectorCross(direction, edge2);
  const a = calculateVectorDot(edge1, h);
  
  if (a > -EPSILON && a < EPSILON) {
    return false;
  }
  
  const f = 1 / a;
  const s = [origin[0] - v0[0], origin[1] - v0[1], origin[2] - v0[2]];
  const u = f * calculateVectorDot(s, h);
  
  if (u < 0 || u > 1) {
    return false;
  }
  
  const q = calculateVectorCross(s, edge1);
  const v = f * calculateVectorDot(direction, q);
  
  if (v < 0 || u + v > 1) {
    return false;
  }
  
  const t = f * calculateVectorDot(edge2, q);
  
  return t > EPSILON;
}

export function generateCorticalSources(brainMesh: MeshData, depth: number = 3): number[][] {
  const sources: number[][] = [];
  const normals = computeMeshNormals(brainMesh);
  
  for (let i = 0; i < brainMesh.vertices.length; i++) {
    const vertex = brainMesh.vertices[i];
    const normal = normals[i];
    
    for (let d = 0; d < depth; d++) {
      const source = [
        vertex[0] - normal[0] * (d + 1) * 2,
        vertex[1] - normal[1] * (d + 1) * 2,
        vertex[2] - normal[2] * (d + 1) * 2
      ];
      sources.push(source);
    }
  }
  
  return sources;
}
