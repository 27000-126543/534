export interface ForwardProblemParams {
  taskId: string;
  headModelId: string;
  method: 'bem' | 'fem' | 'analytical';
  sourceModel: 'cortical' | 'volumetric' | 'mixed';
  conductivityParams?: {
    scalp: number;
    skull: number;
    brain: number;
    unit: string;
  };
}

export interface ForwardProblemResult {
  success: boolean;
  forwardResultId?: string;
  leadfieldMatrix: {
    channels: string[];
    sources: number[][];
    matrix: number[][];
  };
  solutionMethod: string;
  computationTime: number;
  error?: string;
  metrics?: {
    conditionNumber: number;
    rank: number;
    singularValues: number[];
  };
}

export interface BEMModel {
  scalp: {
    vertices: number[][];
    faces: number[][];
    normals: number[][];
    conductivity: number;
  };
  skull: {
    vertices: number[][];
    faces: number[][];
    normals: number[][];
    conductivity: number;
  };
  brain: {
    vertices: number[][];
    faces: number[][];
    normals: number[][];
    conductivity: number;
  };
}

export interface LeadFieldConfig {
  sourceOrientation: 'fixed' | 'free' | 'loose';
  looseWeight?: number;
  depthWeighting?: boolean;
  depthWeightingExponent?: number;
  normalize?: boolean;
}

export const DEFAULT_LEADFIELD_CONFIG: LeadFieldConfig = {
  sourceOrientation: 'fixed',
  depthWeighting: true,
  depthWeightingExponent: 0.5,
  normalize: true
};

export interface ElectrodeData {
  label: string;
  position: [number, number, number];
  isReference: boolean;
}

export interface SourceData {
  position: [number, number, number];
  orientation?: [number, number, number];
  region?: string;
}

export interface SingularValueDecomposition {
  U: number[][];
  S: number[];
  Vt: number[][];
  conditionNumber: number;
  rank: number;
}
