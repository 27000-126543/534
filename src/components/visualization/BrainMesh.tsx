import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BrainMeshProps {
  vertices: number[][];
  faces: number[][];
  layerType: 'scalp' | 'skull' | 'brain';
  opacity?: number;
  wireframe?: boolean;
  highlightIndices?: number[];
  currentDensityValues?: number[];
}

const LAYER_COLORS = {
  scalp: '#f5d0c5',
  skull: '#e8dcc8',
  brain: '#d4a5a5'
};

export function BrainMesh({
  vertices,
  faces,
  layerType,
  opacity = 1,
  wireframe = false,
  highlightIndices = [],
  currentDensityValues
}: BrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const positions: number[] = [];
    const indices: number[] = [];

    vertices.forEach((v) => {
      positions.push(v[0] / 10, v[1] / 10, v[2] / 10);
    });

    faces.forEach((f) => {
      indices.push(f[0], f[1], f[2]);
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    if (currentDensityValues && currentDensityValues.length === vertices.length) {
      const colors: number[] = [];
      const maxVal = Math.max(...currentDensityValues);
      const minVal = Math.min(...currentDensityValues);
      const range = maxVal - minVal || 1;

      currentDensityValues.forEach((val) => {
        const normalized = (val - minVal) / range;
        const color = new THREE.Color();
        if (normalized < 0.25) {
          color.setHSL(0.6, 0.8, 0.3 + normalized * 0.4);
        } else if (normalized < 0.5) {
          color.setHSL(0.4 - (normalized - 0.25) * 1.6, 0.8, 0.4);
        } else if (normalized < 0.75) {
          color.setHSL(0.1 - (normalized - 0.5) * 0.4, 0.9, 0.5);
        } else {
          color.setHSL(0, 0.9, 0.4 + (normalized - 0.75) * 0.4);
        }
        colors.push(color.r, color.g, color.b);
      });

      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }

    return geo;
  }, [vertices, faces, currentDensityValues]);

  useFrame((state) => {
    if (meshRef.current && wireframe) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  const material = useMemo(() => {
    if (currentDensityValues) {
      return new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        opacity,
        wireframe,
        metalness: 0.1,
        roughness: 0.6,
        side: THREE.DoubleSide
      });
    }

    return new THREE.MeshStandardMaterial({
      color: LAYER_COLORS[layerType],
      transparent: true,
      opacity,
      wireframe,
      metalness: layerType === 'skull' ? 0.3 : 0.1,
      roughness: layerType === 'scalp' ? 0.8 : 0.5,
      side: THREE.DoubleSide
    });
  }, [layerType, opacity, wireframe, currentDensityValues]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow>
      {highlightIndices.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={highlightIndices.length}
              array={new Float32Array(
                highlightIndices.flatMap((i) => [
                  vertices[i][0] / 10,
                  vertices[i][1] / 10,
                  vertices[i][2] / 10
                ])
              )}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={0.3} color="#ff0000" sizeAttenuation />
        </points>
      )}
    </mesh>
  );
}
