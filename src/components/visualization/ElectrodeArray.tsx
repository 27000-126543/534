import { useMemo } from 'react';
import * as THREE from 'three';

interface ElectrodePosition {
  label: string;
  position: [number, number, number];
}

interface ElectrodeArrayProps {
  electrodes: ElectrodePosition[];
  showLabels?: boolean;
  highlightLabels?: string[];
  activeLabels?: string[];
}

const ELECTRODE_STANDARD: Record<string, [number, number, number]> = {
  Fp1: [-2.6, 8.5, 2.5], Fp2: [2.6, 8.5, 2.5],
  F3: [-4.2, 6, 5.5], F4: [4.2, 6, 5.5],
  Fz: [0, 7, 6.5],
  C3: [-5.5, 0, 7], C4: [5.5, 0, 7], Cz: [0, 0, 8],
  P3: [-4.2, -6, 5.5], P4: [4.2, -6, 5.5], Pz: [0, -7, 6.5],
  O1: [-2.6, -8.5, 2.5], O2: [2.6, -8.5, 2.5],
  F7: [-5.5, 6, 1.5], F8: [5.5, 6, 1.5],
  T3: [-6.5, 0, 2.5], T4: [6.5, 0, 2.5],
  T5: [-5.5, -6, 1.5], T6: [5.5, -6, 1.5],
  FC1: [-2.5, 3, 7], FC2: [2.5, 3, 7],
  FC5: [-5, 3, 4.5], FC6: [5, 3, 4.5],
  CP1: [-2.5, -3, 7], CP2: [2.5, -3, 7],
  CP5: [-5, -3, 4.5], CP6: [5, -3, 4.5],
  AF3: [-2, 7.5, 4.5], AF4: [2, 7.5, 4.5],
  AF7: [-3.5, 7.5, 1.5], AF8: [3.5, 7.5, 1.5],
  PO3: [-2, -7.5, 4.5], PO4: [2, -7.5, 4.5],
  PO7: [-3.5, -7.5, 1.5], PO8: [3.5, -7.5, 1.5],
  FT7: [-5.8, 3, 2], FT8: [5.8, 3, 2],
  TP7: [-5.8, -3, 2], TP8: [5.8, -3, 2],
  FCz: [0, 3.5, 7.5], CPz: [0, -3.5, 7.5],
  Oz: [0, -8.5, 3], Iz: [0, -9, 1.5]
};

export function ElectrodeArray({
  electrodes,
  showLabels = true,
  highlightLabels = [],
  activeLabels = []
}: ElectrodeArrayProps) {
  const displayElectrodes = useMemo(() => {
    if (electrodes.length > 0) return electrodes;
    return Object.entries(ELECTRODE_STANDARD).map(([label, pos]) => ({
      label,
      position: pos
    }));
  }, [electrodes]);

  const { positions, colors, sizes, labels } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const siz: number[] = [];
    const lab: string[] = [];

    displayElectrodes.forEach((elec) => {
      pos.push(elec.position[0] / 10, elec.position[1] / 10, elec.position[2] / 10);

      let color = new THREE.Color('#90A4AE');
      let size = 0.08;

      if (activeLabels.includes(elec.label)) {
        color = new THREE.Color('#4CAF50');
        size = 0.12;
      } else if (highlightLabels.includes(elec.label)) {
        color = new THREE.Color('#FF5722');
        size = 0.1;
      }

      col.push(color.r, color.g, color.b);
      siz.push(size);
      lab.push(elec.label);
    });

    return { positions: pos, colors: col, sizes: siz, labels: lab };
  }, [displayElectrodes, highlightLabels, activeLabels]);

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={new Float32Array(positions)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={new Float32Array(colors)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={sizes.length}
            array={new Float32Array(sizes)}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.9}
          size={0.1}
        />
      </points>

      {showLabels &&
        displayElectrodes.map((elec, idx) => (
          <sprite
            key={elec.label}
            position={[
              elec.position[0] / 10,
              elec.position[1] / 10 + 0.15,
              elec.position[2] / 10
            ]}
            scale={[0.5, 0.2, 1]}
          >
            <spriteMaterial
              transparent
              opacity={0.9}
              depthTest={false}
            />
          </sprite>
        ))}
    </group>
  );
}
