'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useSpatialStore } from '../../store/useSpatialStore';

// ─── 3D Realistic Tree Component (Orchard) ───
function AppleTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tree Trunk */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.8, 8]} />
        <meshStandardMaterial color="#4e342e" roughness={0.9} />
      </mesh>
      {/* Foliage Canopy */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.6} />
      </mesh>
      {/* Red Apples */}
      <mesh position={[0.2, 1.1, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#d32f2f" roughness={0.3} />
      </mesh>
      <mesh position={[-0.25, 0.9, -0.15]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#d32f2f" roughness={0.3} />
      </mesh>
      <mesh position={[0.1, 0.85, -0.25]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#d32f2f" roughness={0.3} />
      </mesh>
    </group>
  );
}

// ─── 3D Realistic Corn Stalk Row Component ───
function CornStalk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Stalk */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.7, 6]} />
        <meshStandardMaterial color="#689f38" roughness={0.7} />
      </mesh>
      {/* Leaf Blades */}
      <mesh position={[0.08, 0.4, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.25, 0.02, 0.06]} />
        <meshStandardMaterial color="#558b2f" roughness={0.6} />
      </mesh>
      <mesh position={[-0.08, 0.3, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.25, 0.02, 0.06]} />
        <meshStandardMaterial color="#33691e" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ─── 3D Realistic Vineyard Trellis Row Component ───
function VineyardRow({ position, length }: { position: [number, number, number]; length: number }) {
  return (
    <group position={position}>
      {/* Trellis Wire Support Posts */}
      <mesh position={[-length / 2, 0.4, 0]}>
        <boxGeometry args={[0.06, 0.8, 0.06]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>
      <mesh position={[length / 2, 0.4, 0]}>
        <boxGeometry args={[0.06, 0.8, 0.06]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>
      {/* Wire Line */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[length, 0.01, 0.01]} />
        <meshStandardMaterial color="#b0bec5" metalness={0.8} />
      </mesh>
      {/* Grape Vine Canopy Bush */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[length - 0.1, 0.35, 0.3]} />
        <meshStandardMaterial color="#388e3c" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ─── Realistic Pump House Structure ───
// ─── Compact Realistic Pump House Structure ───
function PumpHouse({ position, active }: { position: [number, number, number]; active: boolean }) {
  return (
    <group position={position}>
      {/* Compact Concrete House Base */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.45, 0.35, 0.45]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.42, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.38, 0.18, 4]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      {/* Status LED Beacon */}
      <mesh position={[0, 0.54, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial
          color={active ? '#059669' : '#dc2626'}
          emissive={active ? '#059669' : '#dc2626'}
          emissiveIntensity={1.0}
        />
      </mesh>
    </group>
  );
}

// ─── Compact Master High-Capacity Farm Pump Station Component ───
function MasterPumpStation({ position, activePumpsCount }: { position: [number, number, number]; activePumpsCount: number }) {
  const isAnyRunning = activePumpsCount > 0;

  return (
    <group position={position}>
      {/* Compact Foundation Pad */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.2, 1.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </mesh>

      {/* Industrial Pump Shelter Body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.3, 0.7, 0.9]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Twin High-Pressure Turbine Motors */}
      <mesh position={[-0.35, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.35, 16]} />
        <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.35, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.35, 16]} />
        <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Manifold Outlet Flange */}
      <mesh position={[-0.7, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.25, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>

      {/* Status Beacon LED */}
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={isAnyRunning ? '#059669' : '#dc2626'}
          emissive={isAnyRunning ? '#059669' : '#dc2626'}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Text Label */}
      <Text position={[0, 1.5, 0]} fontSize={0.26} color="#0284c7" anchorX="center" anchorY="middle">
        {`MASTER PUMP\n[ACTIVE: ${activePumpsCount}]`}
      </Text>
    </group>
  );
}

// ─── 3D Elevated Pipe Structure with Support Stanchions & Animated Flow ───
function RealisticPipeLine({ start, end, active }: { start: [number, number, number]; end: [number, number, number]; active: boolean }) {
  const pStart = new THREE.Vector3(...start);
  const pEnd = new THREE.Vector3(...end);
  const dist = pStart.distanceTo(pEnd);

  const mid = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    // Only animate water flow when pump is active
    if (active && pulseRef.current) {
      const t = (state.clock.getElapsedTime() * 0.5) % 1;
      pulseRef.current.position.lerpVectors(pStart, pEnd, t);
    }
  });

  return (
    <group>
      {/* Pipe Support Stanchion Pillars at Start and End */}
      <mesh position={[start[0], start[1] / 2, start[2]]}>
        <boxGeometry args={[0.08, start[1], 0.08]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>
      <mesh position={[end[0], end[1] / 2, end[2]]}>
        <boxGeometry args={[0.08, end[1], 0.08]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Pipe Metallic Outer Tube */}
      <mesh position={mid} lookAt={() => pEnd}>
        <cylinderGeometry args={[0.06, 0.06, dist, 12]} />
        <meshStandardMaterial
          color={active ? '#0284c7' : '#64748b'}
          emissive={active ? '#0284c7' : '#000000'}
          emissiveIntensity={active ? 0.4 : 0}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Joint Flange Rings at Pipe Ends */}
      <mesh position={start} lookAt={() => pEnd}>
        <torusGeometry args={[0.08, 0.02, 8, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} />
      </mesh>
      <mesh position={end} lookAt={() => pEnd}>
        <torusGeometry args={[0.08, 0.02, 8, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} />
      </mesh>

      {/* Animated Water Pulse Capsule - ONLY RENDERED WHEN WATER IS FLOWING */}
      {active && (
        <mesh ref={pulseRef} position={start}>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.0}
          />
        </mesh>
      )}
    </group>
  );
}

// ─── Realistic Crop Field Zone Parcel ───
function RealisticZoneParcel({
  id,
  name,
  crop,
  moisture,
  position,
  size,
  isPumpRunning,
  isSelected,
  onClick,
}: {
  id: string;
  name: string;
  crop: string;
  moisture: number;
  position: [number, number, number];
  size: [number, number];
  isPumpRunning: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Status color badge
  const getStatusBadgeColor = () => {
    if (moisture < 30) return '#dc2626'; // Danger Low
    if (moisture > 60) return '#059669'; // Optimal
    return '#0284c7'; // Balanced
  };

  // Crop soil color
  const getSoilColor = () => {
    if (id === 'zone-1') return '#558b2f'; // Corn green soil
    if (id === 'zone-2') return '#2e7d32'; // Soybean rich canopy
    if (id === 'zone-3') return '#4e342e'; // Vineyard dark soil
    return '#689f38'; // Orchard grass bed
  };

  return (
    <group position={position} onClick={onClick}>
      {/* Rich Crop Field Terrain Bed */}
      <mesh ref={meshRef} position={[0, 0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[size[0], 0.12, size[1]]} />
        <meshStandardMaterial
          color={getSoilColor()}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Field Boundary Frame Highlight */}
      <lineSegments position={[0, 0.13, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(size[0], 0.12, size[1])]} />
        <lineBasicMaterial color={isSelected ? '#0284c7' : getStatusBadgeColor()} linewidth={isSelected ? 3 : 1} />
      </lineSegments>

      {/* Procedural 3D Crop Plants */}
      {id === 'zone-4' && (
        <group>
          <AppleTree position={[-1.1, 0.12, -1]} />
          <AppleTree position={[1.1, 0.12, -1]} />
          <AppleTree position={[-1.1, 0.12, 1]} />
          <AppleTree position={[1.1, 0.12, 1]} />
        </group>
      )}

      {id === 'zone-1' && (
        <group>
          {[-1.2, -0.4, 0.4, 1.2].map((x) =>
            [-1.1, 0, 1.1].map((z) => (
              <CornStalk key={`corn-${x}-${z}`} position={[x, 0.12, z]} />
            ))
          )}
        </group>
      )}

      {id === 'zone-3' && (
        <group>
          <VineyardRow position={[0, 0.12, -1]} length={size[0] - 0.6} />
          <VineyardRow position={[0, 0.12, 0]} length={size[0] - 0.6} />
          <VineyardRow position={[0, 0.12, 1]} length={size[0] - 0.6} />
        </group>
      )}

      {/* Dedicated Pump Station */}
      <PumpHouse
        position={[size[0] / 2 - 0.4, 0.12, size[1] / 2 - 0.4]}
        active={isPumpRunning}
      />

      {/* Sensor Beacon */}
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.4}>
        <mesh position={[0, 1.2, 0]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial
            color={getStatusBadgeColor()}
            emissive={getStatusBadgeColor()}
            emissiveIntensity={0.8}
            wireframe
          />
        </mesh>
      </Float>

      {/* Floating Holographic Placard */}
      <Text
        position={[0, 2.1, 0]}
        fontSize={0.32}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
      >
        {`${name}\n(${crop}) — ${moisture}%\n[PUMP: ${isPumpRunning ? 'RUNNING' : 'OFF'}]`}
      </Text>
    </group>
  );
}

// ─── Main Realistic Farm Canvas Component ───
export function FarmSpatialCanvas() {
  const { selectedZoneId, setSelectedZoneId, latestReadings, pumps } = useSpatialStore();

  const zonesData = [
    { id: 'zone-1', name: 'Zone 1: Corn Field', crop: 'Maize', pos: [-4.2, 0, -2.2] as [number, number, number], size: [3.8, 3.8] as [number, number] },
    { id: 'zone-2', name: 'Zone 2: Soybean Sector', crop: 'Soybean', pos: [1.2, 0, -2.2] as [number, number, number], size: [4.2, 3.8] as [number, number] },
    { id: 'zone-3', name: 'Zone 3: Vineyard East', crop: 'Grapes', pos: [-4.2, 0, 3.2] as [number, number, number], size: [3.8, 4.2] as [number, number] },
    { id: 'zone-4', name: 'Zone 4: Orchard North', crop: 'Apples', pos: [1.2, 0, 3.2] as [number, number, number], size: [4.2, 4.2] as [number, number] },
  ];

  // Helper to determine if a zone's water pump is active and water is flowing
  const isWaterFlowingForZone = (zoneId: string) => {
    const pump = pumps.find(
      (p) => p.zoneId === zoneId || p.id === `pump-${zoneId.replace('zone-', '')}`
    );
    return Boolean(pump && pump.status === 'RUNNING' && pump.flowRateLmin > 0);
  };

  const activePumpsCount = pumps.filter((p) => p.status === 'RUNNING').length;

  return (
    <div className="relative w-full h-[650px] rounded-2xl overflow-hidden neu-convex border border-white/80">
      {/* HUD Header Bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 neu-convex px-4 py-2 rounded-xl border border-white/80">
        <div className="w-3 h-3 rounded-full bg-cyber-emerald animate-ping" />
        <span className="text-xs font-mono tracking-widest text-cyber-cyan uppercase font-bold">
          PHOTOREALISTIC 3D SMART FARM TERRAIN ENGINE
        </span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setSelectedZoneId('zone-1')}
          className="px-3 py-1.5 text-xs font-mono rounded-xl neu-button text-slate-700 hover:text-cyber-cyan font-bold"
        >
          RESET CAMERA
        </button>
      </div>

      {/* Three.js Canvas */}
      <Canvas camera={{ position: [0, 10, 12], fov: 45 }} shadows>
        {/* Realistic Lighting Environment */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[12, 18, 12]}
          intensity={1.6}
          color="#fffbeb"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} color="#0284c7" intensity={0.6} />

        {/* Farmland Dirt Earth Base */}
        <mesh position={[0, -0.02, 0]} receiveShadow>
          <boxGeometry args={[26, 0.04, 26]} />
          <meshStandardMaterial color="#8d6e63" roughness={0.9} />
        </mesh>

        {/* Gravel Access Road Cross-Path */}
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[2.2, 0.02, 25]} />
          <meshStandardMaterial color="#d7ccc8" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[25, 0.02, 2.2]} />
          <meshStandardMaterial color="#d7ccc8" roughness={0.7} />
        </mesh>

        {/* Master High-Capacity Farm Pump Station (Replaces Tank Silo) */}
        <MasterPumpStation position={[6.5, 0, 0]} activePumpsCount={activePumpsCount} />

        {/* Master Feeder Manifold Pipeline from Master Pump Station to Central Junction */}
        <RealisticPipeLine
          start={[6.5, 0.3, 0]}
          end={[0, 0.3, 0]}
          active={activePumpsCount > 0}
        />

        {/* Branch Pipelines from Central Junction out to Zone Sub-Pump Stations */}
        <RealisticPipeLine
          start={[0, 0.3, 0]}
          end={[-2.5, 0.3, -0.5]}
          active={isWaterFlowingForZone('zone-1')}
        />
        <RealisticPipeLine
          start={[0, 0.3, 0]}
          end={[3.1, 0.3, -0.5]}
          active={isWaterFlowingForZone('zone-2')}
        />
        <RealisticPipeLine
          start={[0, 0.3, 0]}
          end={[-2.5, 0.3, 5.1]}
          active={isWaterFlowingForZone('zone-3')}
        />
        <RealisticPipeLine
          start={[0, 0.3, 0]}
          end={[3.1, 0.3, 5.1]}
          active={isWaterFlowingForZone('zone-4')}
        />

        {/* Zone Parcels */}
        {zonesData.map((z) => {
          const reading = latestReadings.get(z.id);
          const moisture = reading ? reading.soilMoisture : 45;
          const isPumpRunning = isWaterFlowingForZone(z.id);

          return (
            <RealisticZoneParcel
              key={z.id}
              id={z.id}
              name={z.name}
              crop={z.crop}
              moisture={moisture}
              position={z.pos}
              size={z.size}
              isPumpRunning={isPumpRunning}
              isSelected={selectedZoneId === z.id}
              onClick={() => setSelectedZoneId(z.id)}
            />
          );
        })}

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={5} maxDistance={22} />
      </Canvas>
    </div>
  );
}

export default FarmSpatialCanvas;
