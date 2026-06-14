export interface Vertex3D {
  x: number;
  y: number;
  z: number;
}

export interface Face3D {
  v1: number;
  v2: number;
  v3: number;
}

export interface MeshData {
  vertices: number[][];
  faces: number[][];
  normals?: number[][];
  vertexLabels?: number[];
}

export interface TissueConductivity {
  scalp: number;
  skull: number;
  brain: number;
  unit: string;
}

export interface HeadModelBuildParams {
  taskId: string;
  mriSegmentationPath: string;
  electrodePositionsPath: string;
  conductivityParams?: Partial<TissueConductivity>;
  meshResolution?: 'coarse' | 'medium' | 'fine';
  smoothingIterations?: number;
}

export interface HeadModelBuildResult {
  success: boolean;
  headModelId?: string;
  scalpMesh?: MeshData;
  skullMesh?: MeshData;
  brainMesh?: MeshData;
  conductivityParams: TissueConductivity;
  meshQuality: number;
  triangleCount: number;
  electrodePositions?: number[][];
  error?: string;
  computationTime: number;
}

export interface MeshQualityMetrics {
  aspectRatio: {
    mean: number;
    max: number;
    min: number;
  };
  triangleArea: {
    mean: number;
    max: number;
    min: number;
    total: number;
  };
  interiorAngle: {
    mean: number;
    max: number;
    min: number;
  };
  qualityScore: number;
  poorQualityCount: number;
}

export interface MRISegmentationData {
  affine: number[][];
  voxelDimensions: [number, number, number];
  dimensions: [number, number, number];
  tissueLabels: {
    scalp: number[][];
    skull: number[][];
    brain: number[][];
  };
}

export interface ElectrodePosition {
  label: string;
  position: [number, number, number];
  isReference: boolean;
}

export const DEFAULT_CONDUCTIVITY: TissueConductivity = {
  scalp: 0.33,
  skull: 0.0042,
  brain: 0.33,
  unit: 'S/m'
};

export const MESH_RESOLUTION_PARAMS = {
  coarse: {
    scalpVertices: 500,
    skullVertices: 400,
    brainVertices: 300,
    maxEdgeLength: 10
  },
  medium: {
    scalpVertices: 2000,
    skullVertices: 1500,
    brainVertices: 1000,
    maxEdgeLength: 6
  },
  fine: {
    scalpVertices: 5000,
    skullVertices: 4000,
    brainVertices: 3000,
    maxEdgeLength: 3
  }
};
