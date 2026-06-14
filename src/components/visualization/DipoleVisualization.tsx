import { useMemo } from 'react';
import * as THREE from 'three';
import { ArrowHelper, Cone, Sphere } from '@react-three/drei';

interface DipoleVisualizationProps {
  position: [number, number, number];
  moment: [number, number, number];
  goodnessOfFit?: number;
  showLabel?: boolean;
  color?: string;
  scale?: number;
}

export function DipoleVisualization({
  position,
  moment,
  goodnessOfFit,
  color = '#ff6b6b',
  scale = 1
}: DipoleVisualizationProps) {
  const scaledPosition: [number, number, number] = useMemo(
    () => [position[0] / 10, position[1] / 10, position[2] / 10],
    [position]
  );

  const normalizedMoment = useMemo(() => {
    const length = Math.sqrt(moment[0] ** 2 + moment[1] ** 2 + moment[2] ** 2);
    if (length === 0) return [0, 1, 0];
    return [moment[0] / length, moment[1] / length, moment[2] / length] as [number, number, number];
  }, [moment]);

  const endPosition: [number, number, number] = useMemo(
    () => [
      scaledPosition[0] + normalizedMoment[0] * 2 * scale,
      scaledPosition[1] + normalizedMoment[1] * 2 * scale,
      scaledPosition[2] + normalizedMoment[2] * 2 * scale
    ],
    [scaledPosition, normalizedMoment, scale]
  );

  const arrowColor = useMemo(() => {
    if (!goodnessOfFit) return color;
    if (goodnessOfFit >= 0.95) return '#26A69A';
    if (goodnessOfFit >= 0.85) return '#42A5F5';
    if (goodnessOfFit >= 0.7) return '#FF9800';
    return '#EF5350';
  }, [goodnessOfFit, color]);

  return (
    <group>
      <Sphere position={scaledPosition} args={[0.15 * scale, 16, 16]}>
        <meshStandardMaterial color={arrowColor} metalness={0.5} roughness={0.2} />
      </Sphere>

      <ArrowHelper
        origin={new THREE.Vector3(...scaledPosition)}
        dir={new THREE.Vector3(...normalizedMoment)}
        length={2 * scale}
        color={arrowColor}
        headLength={0.4 * scale}
        headWidth={0.2 * scale}
      />

      <Cone
        position={endPosition}
        args={[0.2 * scale, 0.4 * scale, 8]}
        rotation={[
          Math.atan2(
            -normalizedMoment[2],
            Math.sqrt(normalizedMoment[0] ** 2 + normalizedMoment[1] ** 2)
          ),
          0,
          Math.atan2(normalizedMoment[0], normalizedMoment[1])
        ]}
      >
        <meshStandardMaterial color={arrowColor} metalness={0.6} roughness={0.2} />
      </Cone>
    </group>
  );
}
