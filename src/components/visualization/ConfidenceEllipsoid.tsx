import { useMemo } from 'react';
import * as THREE from 'three';

interface ConfidenceEllipsoidProps {
  center: [number, number, number];
  radii: [number, number, number];
  rotation: number[][];
  confidenceLevel?: number;
  opacity?: number;
  color?: string;
  wireframe?: boolean;
}

export function ConfidenceEllipsoid({
  center,
  radii,
  rotation,
  confidenceLevel = 0.95,
  opacity = 0.3,
  color = '#42A5F5',
  wireframe = false
}: ConfidenceEllipsoidProps) {
  const scaledCenter: [number, number, number] = useMemo(
    () => [center[0] / 10, center[1] / 10, center[2] / 10],
    [center]
  );

  const scaledRadii: [number, number, number] = useMemo(
    () => [radii[0] / 10, radii[1] / 10, radii[2] / 10],
    [radii]
  );

  const eulerRotation = useMemo(() => {
    const rotMatrix = new THREE.Matrix3();
    rotMatrix.set(
      rotation[0][0], rotation[0][1], rotation[0][2],
      rotation[1][0], rotation[1][1], rotation[1][2],
      rotation[2][0], rotation[2][1], rotation[2][2]
    );
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().setFromMatrix3(rotMatrix)
    );
    return new THREE.Euler().setFromQuaternion(quaternion);
  }, [rotation]);

  const ellipsoidColor = useMemo(() => {
    if (confidenceLevel >= 0.99) return '#7E57C2';
    if (confidenceLevel >= 0.95) return '#42A5F5';
    if (confidenceLevel >= 0.9) return '#26A69A';
    return '#FF9800';
  }, [confidenceLevel]);

  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(1, 32, 32);
  }, []);

  return (
    <group position={scaledCenter} rotation={eulerRotation}>
      <mesh scale={scaledRadii} geometry={geometry}>
        <meshStandardMaterial
          color={wireframe ? '#ffffff' : ellipsoidColor || color}
          transparent
          opacity={wireframe ? 0.8 : opacity}
          wireframe={wireframe}
          side={THREE.DoubleSide}
          depthWrite={!wireframe}
        />
      </mesh>

      {!wireframe && (
        <mesh scale={scaledRadii} geometry={geometry}>
          <meshBasicMaterial
            color={ellipsoidColor || color}
            transparent
            opacity={0.1}
            wireframe
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <group>
        <mesh position={[scaledRadii[0], 0, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={ellipsoidColor || color} />
        </mesh>
        <mesh position={[-scaledRadii[0], 0, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={ellipsoidColor || color} />
        </mesh>
        <mesh position={[0, scaledRadii[1], 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={ellipsoidColor || color} />
        </mesh>
        <mesh position={[0, -scaledRadii[1], 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={ellipsoidColor || color} />
        </mesh>
        <mesh position={[0, 0, scaledRadii[2]]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={ellipsoidColor || color} />
        </mesh>
        <mesh position={[0, 0, -scaledRadii[2]]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={ellipsoidColor || color} />
        </mesh>
      </group>
    </group>
  );
}
