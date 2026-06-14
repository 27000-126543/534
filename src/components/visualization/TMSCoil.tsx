import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Torus, Cylinder, ArrowHelper } from '@react-three/drei';

interface TMSCoilProps {
  position: [number, number, number];
  normal: [number, number, number];
  handleDirection: [number, number, number];
  angleDegrees?: number;
  currentIntensity?: number;
  coilType?: 'figure8' | 'circular' | 'h-coil';
  showElectricField?: boolean;
  animate?: boolean;
}

export function TMSCoil({
  position,
  normal,
  handleDirection,
  angleDegrees = 0,
  currentIntensity = 80,
  coilType = 'figure8',
  showElectricField = false,
  animate = false
}: TMSCoilProps) {
  const scaledPosition: [number, number, number] = useMemo(
    () => [position[0] / 10, position[1] / 10, position[2] / 10],
    [position]
  );

  const normalizedNormal = useMemo(() => {
    const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    if (length === 0) return [0, -1, 0];
    return [normal[0] / length, normal[1] / length, normal[2] / length] as [number, number, number];
  }, [normal]);

  const quaternion = useMemo(() => {
    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const normalVec = new THREE.Vector3(...normalizedNormal);
    quat.setFromUnitVectors(up, normalVec);

    if (angleDegrees !== 0) {
      const rotationAxis = new THREE.Vector3(...normalizedNormal);
      const angleQuat = new THREE.Quaternion().setFromAxisAngle(
        rotationAxis,
        (angleDegrees * Math.PI) / 180
      );
      quat.multiply(angleQuat);
    }

    return quat;
  }, [normalizedNormal, angleDegrees]);

  const normalizedHandle = useMemo(() => {
    const length = Math.sqrt(
      handleDirection[0] ** 2 + handleDirection[1] ** 2 + handleDirection[2] ** 2
    );
    if (length === 0) return [1, 0, 0];
    return [
      handleDirection[0] / length,
      handleDirection[1] / length,
      handleDirection[2] / length
    ] as [number, number, number];
  }, [handleDirection]);

  const intensityColor = useMemo(() => {
    if (currentIntensity >= 100) return '#D32F2F';
    if (currentIntensity >= 80) return '#FF9800';
    if (currentIntensity >= 60) return '#42A5F5';
    return '#26A69A';
  }, [currentIntensity]);

  const electricFieldOpacity = animate ? 0.3 + 0.2 * Math.sin(Date.now() / 500) : 0.3;

  useFrame((state, delta) => {
    if (animate) {
      electricFieldOpacity;
    }
  });

  const renderCoilBody = () => {
    switch (coilType) {
      case 'figure8':
        return (
          <group>
            <group position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
              <Torus args={[0.6, 0.08, 16, 32]}>
                <meshStandardMaterial
                  color="#455A64"
                  metalness={0.8}
                  roughness={0.2}
                />
              </Torus>
            </group>
            <group position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
              <Torus args={[0.6, 0.08, 16, 32]}>
                <meshStandardMaterial
                  color="#455A64"
                  metalness={0.8}
                  roughness={0.2}
                />
              </Torus>
            </group>
            <Cylinder
              position={[0, 0, 0]}
              args={[0.15, 0.15, 0.3, 16]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <meshStandardMaterial
                color="#37474F"
                metalness={0.7}
                roughness={0.3}
              />
            </Cylinder>
          </group>
        );
      case 'circular':
        return (
          <group>
            <Torus args={[0.8, 0.1, 16, 48]}>
              <meshStandardMaterial
                color="#455A64"
                metalness={0.8}
                roughness={0.2}
              />
            </Torus>
            <Cylinder
              args={[0.1, 0.1, 0.4, 16]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <meshStandardMaterial
                color="#37474F"
                metalness={0.7}
                roughness={0.3}
              />
            </Cylinder>
          </group>
        );
      case 'h-coil':
        return (
          <group>
            <Box position={[-0.8, 0, 0]} args={[0.4, 1.2, 0.3]}>
              <meshStandardMaterial
                color="#455A64"
                metalness={0.8}
                roughness={0.2}
              />
            </Box>
            <Box position={[0.8, 0, 0]} args={[0.4, 1.2, 0.3]}>
              <meshStandardMaterial
                color="#455A64"
                metalness={0.8}
                roughness={0.2}
              />
            </Box>
            <Box position={[0, 0.4, 0]} args={[2, 0.3, 0.3]}>
              <meshStandardMaterial
                color="#455A64"
                metalness={0.8}
                roughness={0.2}
              />
            </Box>
            <Cylinder
              position={[0, 0, 0]}
              args={[0.12, 0.12, 0.4, 16]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <meshStandardMaterial
                color="#37474F"
                metalness={0.7}
                roughness={0.3}
              />
            </Cylinder>
          </group>
        );
    }
  };

  const handleEnd: [number, number, number] = useMemo(() => {
    const handleVec = new THREE.Vector3(...normalizedHandle).applyQuaternion(quaternion);
    return [
      scaledPosition[0] + handleVec.x * 1.5,
      scaledPosition[1] + handleVec.y * 1.5,
      scaledPosition[2] + handleVec.z * 1.5
    ];
  }, [scaledPosition, normalizedHandle, quaternion]);

  return (
    <group position={scaledPosition} quaternion={quaternion}>
      {renderCoilBody()}

      <group position={[0, 1, 0]}>
        <Cylinder args={[0.06, 0.06, 1.5, 12]} position={handleEnd}>
          <meshStandardMaterial color="#263238" metalness={0.6} roughness={0.4} />
        </Cylinder>
        <sphereGeometry args={[0.1, 16, 16]} position={handleEnd} />
        <meshStandardMaterial color="#37474F" metalness={0.7} roughness={0.3} />
      </group>

      <ArrowHelper
        origin={new THREE.Vector3(0, 0, 0)}
        dir={new THREE.Vector3(0, -1, 0)}
        length={1.5}
        color={intensityColor}
        headLength={0.3}
        headWidth={0.15}
      />

      {showElectricField && (
        <group position={[0, -1, 0]}>
          <mesh>
            <coneGeometry args={[1.2, 2, 32, 1, true]} />
            <meshBasicMaterial
              color={intensityColor}
              transparent
              opacity={electricFieldOpacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <coneGeometry args={[0.8, 1.5, 32, 1, true]} />
            <meshBasicMaterial
              color={intensityColor}
              transparent
              opacity={electricFieldOpacity * 1.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      <group position={[0, -0.1, 0]}>
        <mesh>
          <ringGeometry args={[0.9, 1, 64]} />
          <meshBasicMaterial color={intensityColor} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function Box({ position, args }: { position: [number, number, number]; args: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
    </mesh>
  );
}
