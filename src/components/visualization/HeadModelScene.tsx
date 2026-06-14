import { useState, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Environment } from '@react-three/drei';
import { BrainMesh } from './BrainMesh';
import { DipoleVisualization } from './DipoleVisualization';
import { ConfidenceEllipsoid } from './ConfidenceEllipsoid';
import { TMSCoil } from './TMSCoil';
import { ElectrodeArray } from './ElectrodeArray';
import type { HeadModelData, SourceResultData, TargetPlanData } from 'shared/types/api';

interface HeadModelSceneProps {
  headModel?: HeadModelData;
  sourceResult?: SourceResultData;
  targetPlan?: TargetPlanData;
  showScalp?: boolean;
  showSkull?: boolean;
  showBrain?: boolean;
  showDipole?: boolean;
  showConfidenceEllipsoid?: boolean;
  showCoil?: boolean;
  showElectrodes?: boolean;
  showCurrentDensity?: boolean;
  wireframeScalp?: boolean;
  wireframeSkull?: boolean;
  wireframeBrain?: boolean;
  scalpOpacity?: number;
  skullOpacity?: number;
  brainOpacity?: number;
  timeWindowIndex?: number;
  highlightElectrodes?: string[];
  onViewChange?: (view: string) => void;
}

const DEFAULT_SPHERE = {
  vertices: (() => {
    const verts: number[][] = [];
    const latBands = 30;
    const longBands = 30;
    const radius = 9;
    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      for (let long = 0; long <= longBands; long++) {
        const phi = (long * 2 * Math.PI) / longBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        verts.push([radius * x, radius * y, radius * z]);
      }
    }
    return verts;
  })(),
  faces: (() => {
    const faces: number[][] = [];
    const latBands = 30;
    const longBands = 30;
    for (let lat = 0; lat < latBands; lat++) {
      for (let long = 0; long < longBands; long++) {
        const first = lat * (longBands + 1) + long;
        const second = first + longBands + 1;
        faces.push([first, second, first + 1]);
        faces.push([second, second + 1, first + 1]);
      }
    }
    return faces;
  })()
};

export function HeadModelScene({
  headModel,
  sourceResult,
  targetPlan,
  showScalp = true,
  showSkull = true,
  showBrain = true,
  showDipole = true,
  showConfidenceEllipsoid = true,
  showCoil = true,
  showElectrodes = true,
  showCurrentDensity = true,
  wireframeScalp = false,
  wireframeSkull = false,
  wireframeBrain = false,
  scalpOpacity = 0.3,
  skullOpacity = 0.2,
  brainOpacity = 0.9,
  timeWindowIndex = 0,
  highlightElectrodes = []
}: HeadModelSceneProps) {
  const [autoRotate, setAutoRotate] = useState(false);

  const currentDensityValues = useMemo(() => {
    if (!sourceResult?.currentDensity || !showCurrentDensity) return undefined;
    const { values, timePoints } = sourceResult.currentDensity;
    const vertCount = headModel?.brainMesh?.vertices.length || DEFAULT_SPHERE.vertices.length;
    const windowsPerVert = timePoints?.length || 1;
    const idx = Math.min(timeWindowIndex, windowsPerVert - 1);

    const result: number[] = [];
    for (let i = 0; i < vertCount; i++) {
      const valIdx = i * windowsPerVert + idx;
      result.push(values[valIdx] || values[i] || 0);
    }
    return result;
  }, [sourceResult, showCurrentDensity, timeWindowIndex, headModel]);

  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 2, 18]} fov={45} />

        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 15, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-10, 5, -10]} intensity={0.5} />
          <pointLight position={[0, 10, 0]} intensity={0.3} />

          <group rotation={[-0.3, 0, 0]}>
            {showScalp && (
              <BrainMesh
                vertices={headModel?.scalpMesh?.vertices || DEFAULT_SPHERE.vertices}
                faces={headModel?.scalpMesh?.faces || DEFAULT_SPHERE.faces}
                layerType="scalp"
                opacity={scalpOpacity}
                wireframe={wireframeScalp}
              />
            )}

            {showSkull && (
              <BrainMesh
                vertices={headModel?.skullMesh?.vertices || DEFAULT_SPHERE.vertices.map(v => [v[0] * 0.92, v[1] * 0.92, v[2] * 0.92])}
                faces={headModel?.skullMesh?.faces || DEFAULT_SPHERE.faces}
                layerType="skull"
                opacity={skullOpacity}
                wireframe={wireframeSkull}
              />
            )}

            {showBrain && (
              <BrainMesh
                vertices={headModel?.brainMesh?.vertices || DEFAULT_SPHERE.vertices.map(v => [v[0] * 0.85, v[1] * 0.85, v[2] * 0.85])}
                faces={headModel?.brainMesh?.faces || DEFAULT_SPHERE.faces}
                layerType="brain"
                opacity={brainOpacity}
                wireframe={wireframeBrain}
                currentDensityValues={currentDensityValues}
              />
            )}

            {showElectrodes && <ElectrodeArray highlightLabels={highlightElectrodes} electrodes={[]} />}

            {showDipole && sourceResult?.dipoleParameters && (
              <DipoleVisualization
                position={sourceResult.dipoleParameters.position}
                moment={sourceResult.dipoleParameters.moment}
                goodnessOfFit={sourceResult.dipoleParameters.goodnessOfFit}
              />
            )}

            {showConfidenceEllipsoid && sourceResult?.confidenceEllipsoid && (
              <ConfidenceEllipsoid
                center={sourceResult.confidenceEllipsoid.center}
                radii={sourceResult.confidenceEllipsoid.radii}
                rotation={sourceResult.confidenceEllipsoid.rotation}
                confidenceLevel={sourceResult.confidenceEllipsoid.confidenceLevel}
              />
            )}

            {showCoil && targetPlan && (
              <TMSCoil
                position={targetPlan.coilPosition}
                normal={targetPlan.coilOrientation.normal}
                handleDirection={targetPlan.coilOrientation.handleDirection}
                angleDegrees={targetPlan.coilOrientation.angleDegrees}
                currentIntensity={targetPlan.currentIntensity}
                showElectricField
              />
            )}
          </group>

          <ContactShadows
            position={[0, -10, 0]}
            opacity={0.4}
            scale={40}
            blur={2}
            far={20}
          />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          minDistance={8}
          maxDistance={35}
          maxPolarAngle={Math.PI}
        />
      </Canvas>

      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            autoRotate
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          {autoRotate ? '停止旋转' : '自动旋转'}
        </button>
      </div>
    </div>
  );
}
