'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Sun, Moon, Eye, Camera, ShieldAlert, Zap, Droplet, RotateCcw } from 'lucide-react';
import { useSpatialStore } from '../../store/useSpatialStore';
import { StatusIndicator } from '../ui/StatusIndicator';

// ─── 3D Solar Panel Array Component ───
function SolarPanelArray({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Concrete Base */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.8, 0.16, 1.4]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* Support Posts */}
      <mesh position={[-0.7, 0.4, -0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>
      <mesh position={[0.7, 0.4, -0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Tilted Solar Panel Mounting Board */}
      <group position={[0, 0.65, 0]} rotation={[0.4, 0, 0]}>
        {/* Frame */}
        <mesh castShadow>
          <boxGeometry args={[1.7, 0.05, 1.2]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Photovoltaic Cells Surface */}
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[1.6, 0.01, 1.1]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Label */}
      <Text position={[0, 1.2, 0]} fontSize={0.2} color="#0284c7" anchorX="center" anchorY="middle">
        SOLAR ARRAY
      </Text>
    </group>
  );
}

// ─── 3D Wind Turbine Component with Rotating Blades ───
function WindTurbine({ position }: { position: [number, number, number] }) {
  const rotorRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (rotorRef.current) {
      rotorRef.current.rotation.z += delta * 2.5;
    }
  });

  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.2, 16]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* Tall Tapered Tower */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.18, 4.2, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Nacelle Housing */}
      <mesh position={[0, 4.3, 0.1]} castShadow>
        <boxGeometry args={[0.25, 0.25, 0.6]} />
        <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Rotating Rotor Hub & 3 Blades */}
      <group ref={rotorRef} position={[0, 4.3, 0.42]}>
        {/* Nose Cone */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.2, 16]} />
          <meshStandardMaterial color="#0369a1" metalness={0.9} />
        </mesh>
        {/* Blade 1 */}
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.08, 1.8, 0.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* Blade 2 */}
        <mesh position={[0.78, -0.45, 0]} rotation={[0, 0, (2 * Math.PI) / 3]}>
          <boxGeometry args={[0.08, 1.8, 0.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* Blade 3 */}
        <mesh position={[-0.78, -0.45, 0]} rotation={[0, 0, -(2 * Math.PI) / 3]}>
          <boxGeometry args={[0.08, 1.8, 0.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
      </group>

      <Text position={[0, 4.8, 0]} fontSize={0.2} color="#38bdf8" anchorX="center" anchorY="middle">
        WIND TURBINE
      </Text>
    </group>
  );
}

// ─── 3D Water Spray Mist Particle System for Active Pumps ───
function IrrigationMist({ position, active }: { position: [number, number, number]; active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (active && groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 1.5;
    }
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={position}>
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 1.2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <mesh key={i} position={[x, 0.6, z]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.8}
              transparent
              opacity={0.65}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── 3D PIR Motion Wildlife Radar Warning Beacon ───
function WildlifeRadarBeacon({ active }: { active: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (active && ringRef.current) {
      const s = 1 + (state.clock.getElapsedTime() * 3) % 4;
      ringRef.current.scale.set(s, 1, s);
    }
  });

  if (!active) return null;

  return (
    <group position={[0, 0.2, 0]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3, 3.3, 32]} />
        <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>
      <Text position={[0, 3.2, 0]} fontSize={0.45} color="#ef4444" anchorX="center" anchorY="middle">
        ⚠️ PIR WILDLIFE INTRUSION DETECTED!
      </Text>
    </group>
  );
}

// ─── 3D Realistic Crop Components ───
function AppleTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.8, 8]} />
        <meshStandardMaterial color="#4e342e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.6} />
      </mesh>
      <mesh position={[0.2, 1.1, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#d32f2f" roughness={0.3} />
      </mesh>
      <mesh position={[-0.25, 0.9, -0.15]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#d32f2f" roughness={0.3} />
      </mesh>
    </group>
  );
}

function CornStalk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.7, 6]} />
        <meshStandardMaterial color="#689f38" roughness={0.7} />
      </mesh>
      <mesh position={[0.08, 0.4, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.25, 0.02, 0.06]} />
        <meshStandardMaterial color="#558b2f" roughness={0.6} />
      </mesh>
    </group>
  );
}

function VineyardRow({ position, length }: { position: [number, number, number]; length: number }) {
  return (
    <group position={position}>
      <mesh position={[-length / 2, 0.4, 0]}>
        <boxGeometry args={[0.06, 0.8, 0.06]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>
      <mesh position={[length / 2, 0.4, 0]}>
        <boxGeometry args={[0.06, 0.8, 0.06]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[length, 0.01, 0.01]} />
        <meshStandardMaterial color="#b0bec5" metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[length - 0.1, 0.35, 0.3]} />
        <meshStandardMaterial color="#388e3c" roughness={0.7} />
      </mesh>
    </group>
  );
}

function PumpHouse({ position, active }: { position: [number, number, number]; active: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.45, 0.35, 0.45]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.42, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.38, 0.18, 4]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
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

function MasterPumpStation({ position, activePumpsCount }: { position: [number, number, number]; activePumpsCount: number }) {
  const isAnyRunning = activePumpsCount > 0;

  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.2, 1.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.3, 0.7, 0.9]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[-0.35, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.35, 16]} />
        <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.35, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.35, 16]} />
        <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={isAnyRunning ? '#059669' : '#dc2626'}
          emissive={isAnyRunning ? '#059669' : '#dc2626'}
          emissiveIntensity={1.0}
        />
      </mesh>
      <Text position={[0, 1.5, 0]} fontSize={0.26} color="#0284c7" anchorX="center" anchorY="middle">
        {`MASTER PUMP\n[ACTIVE: ${activePumpsCount}]`}
      </Text>
    </group>
  );
}

function RealisticPipeLine({ start, end, active }: { start: [number, number, number]; end: [number, number, number]; active: boolean }) {
  const pStart = new THREE.Vector3(...start);
  const pEnd = new THREE.Vector3(...end);
  const dist = pStart.distanceTo(pEnd);
  const mid = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (active && pulseRef.current) {
      const t = (state.clock.getElapsedTime() * 0.6) % 1;
      pulseRef.current.position.lerpVectors(pStart, pEnd, t);
    }
  });

  return (
    <group>
      <mesh position={[start[0], start[1] / 2, start[2]]}>
        <boxGeometry args={[0.08, start[1], 0.08]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>
      <mesh position={[end[0], end[1] / 2, end[2]]}>
        <boxGeometry args={[0.08, end[1], 0.08]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>
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
      {active && (
        <mesh ref={pulseRef} position={start}>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.0} />
        </mesh>
      )}
    </group>
  );
}

// ─── 3D Realistic Crop Field Parcel with Dynamic Soil Heatmap ───
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
  const getStatusBadgeColor = () => {
    if (moisture < 30) return '#dc2626';
    if (moisture > 60) return '#059669';
    return '#0284c7';
  };

  // Dynamic Soil Moisture Terrain Mesh Shader Tint
  const getDynamicSoilColor = () => {
    if (moisture < 30) return '#784620'; // Dry earth
    if (moisture > 60) return '#1b431e'; // Wet lush green soil
    return '#3a5328'; // Healthy loam
  };

  return (
    <group position={position} onClick={onClick}>
      {/* Terrain Soil Mesh */}
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[size[0], 0.12, size[1]]} />
        <meshStandardMaterial color={getDynamicSoilColor()} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Boundary Frame */}
      <lineSegments position={[0, 0.13, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(size[0], 0.12, size[1])]} />
        <lineBasicMaterial color={isSelected ? '#38bdf8' : getStatusBadgeColor()} linewidth={isSelected ? 3 : 1} />
      </lineSegments>

      {/* Procedural 3D Crop Vegetation */}
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

      {/* Sub-Pump Station */}
      <PumpHouse position={[size[0] / 2 - 0.4, 0.12, size[1] / 2 - 0.4]} active={isPumpRunning} />

      {/* Active Water Spray Mist Particles */}
      <IrrigationMist position={[0, 0.2, 0]} active={isPumpRunning} />

      {/* Holographic Sensor Beacon */}
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.4}>
        <mesh position={[0, 1.2, 0]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial
            color={getStatusBadgeColor()}
            emissive={getStatusBadgeColor()}
            emissiveIntensity={0.9}
            wireframe
          />
        </mesh>
      </Float>

      {/* Floating Placard */}
      <Text position={[0, 2.1, 0]} fontSize={0.32} color="#0f172a" anchorX="center" anchorY="middle">
        {`${name}\n(${crop}) — ${moisture}%\n[PUMP: ${isPumpRunning ? 'ACTIVE 💧' : 'OFF'}]`}
      </Text>
    </group>
  );
}

// ─── Main Spatial 3D Smart Farm Engine Canvas Component ───
export function FarmSpatialCanvas() {
  const { selectedZoneId, setSelectedZoneId, latestReadings, pumps, motionAlert } = useSpatialStore();
  const [nightMode, setNightMode] = useState(false);
  const [cameraView, setCameraView] = useState<'ISOMETRIC' | 'TOP' | 'ZONE_1' | 'ZONE_4'>('ISOMETRIC');

  const controlsRef = useRef<any>(null);

  const zonesData = [
    { id: 'zone-1', name: 'Zone 1: Corn Field', crop: 'Maize', pos: [-4.2, 0, -2.2] as [number, number, number], size: [3.8, 3.8] as [number, number] },
    { id: 'zone-2', name: 'Zone 2: Soybean Sector', crop: 'Soybean', pos: [1.2, 0, -2.2] as [number, number, number], size: [4.2, 3.8] as [number, number] },
    { id: 'zone-3', name: 'Zone 3: Vineyard East', crop: 'Grapes', pos: [-4.2, 0, 3.2] as [number, number, number], size: [3.8, 4.2] as [number, number] },
    { id: 'zone-4', name: 'Zone 4: Orchard North', crop: 'Apples', pos: [1.2, 0, 3.2] as [number, number, number], size: [4.2, 4.2] as [number, number] },
  ];

  const isWaterFlowingForZone = (zoneId: string) => {
    const pump = pumps.find((p) => p.zoneId === zoneId || p.id === `pump-${zoneId.replace('zone-', '')}`);
    return Boolean(pump && pump.status === 'RUNNING' && pump.flowRateLmin > 0);
  };

  const activePumpsCount = pumps.filter((p) => p.status === 'RUNNING').length;

  const handleCameraChange = (view: 'ISOMETRIC' | 'TOP' | 'ZONE_1' | 'ZONE_4') => {
    setCameraView(view);
    if (!controlsRef.current) return;
    if (view === 'TOP') {
      controlsRef.current.object.position.set(0, 16, 0.1);
      controlsRef.current.target.set(0, 0, 0);
    } else if (view === 'ZONE_1') {
      controlsRef.current.object.position.set(-4.2, 6, 3);
      controlsRef.current.target.set(-4.2, 0, -2.2);
    } else if (view === 'ZONE_4') {
      controlsRef.current.object.position.set(1.2, 6, 8);
      controlsRef.current.target.set(1.2, 0, 3.2);
    } else {
      controlsRef.current.object.position.set(0, 10, 14);
      controlsRef.current.target.set(0, 0, 0);
    }
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-[660px] rounded-2xl overflow-hidden skeuo-panel p-2 shadow-2xl border border-slate-400 dark:border-slate-800">
      {/* Corner Hardware Rivets */}
      <span className="skeuo-rivet absolute top-3 left-3 z-20 pointer-events-none" />
      <span className="skeuo-rivet absolute top-3 right-3 z-20 pointer-events-none" />
      <span className="skeuo-rivet absolute bottom-3 left-3 z-20 pointer-events-none" />
      <span className="skeuo-rivet absolute bottom-3 right-3 z-20 pointer-events-none" />

      {/* Console Top Glass HUD Header */}
      <div className="absolute top-5 left-5 right-5 z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 skeuo-glass-bezel">
        <div className="flex items-center gap-3">
          <span className="skeuo-led skeuo-led-cyan" />
          <span className="text-xs font-mono tracking-widest text-cyan-300 font-bold uppercase">
            SPATIAL 3D SMART TERRAIN ENGINE
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-cyan-400 font-bold">
            THREE.JS
          </span>
        </div>

        {/* 3D Viewport Controls Bar */}
        <div className="flex items-center gap-2">
          {/* Day/Night Lighting Switch */}
          <button
            onClick={() => setNightMode(!nightMode)}
            className="px-3 py-1.5 rounded-lg skeuo-button text-xs font-mono font-bold flex items-center gap-1.5 text-slate-200"
          >
            {nightMode ? <Sun size={12} className="text-amber-400" /> : <Moon size={12} className="text-cyan-400" />}
            <span>{nightMode ? 'DAY LIGHT' : 'NIGHT CYBER'}</span>
          </button>

          {/* Camera Angles */}
          <button
            onClick={() => handleCameraChange('ISOMETRIC')}
            className={`px-2.5 py-1.5 rounded-lg skeuo-button text-[10px] font-mono font-bold uppercase ${cameraView === 'ISOMETRIC' ? 'skeuo-button-active text-cyan-400' : 'text-slate-300'}`}
          >
            ISO VIEW
          </button>
          <button
            onClick={() => handleCameraChange('TOP')}
            className={`px-2.5 py-1.5 rounded-lg skeuo-button text-[10px] font-mono font-bold uppercase ${cameraView === 'TOP' ? 'skeuo-button-active text-cyan-400' : 'text-slate-300'}`}
          >
            TOP DOWN
          </button>
          <button
            onClick={() => handleCameraChange('ZONE_1')}
            className={`px-2.5 py-1.5 rounded-lg skeuo-button text-[10px] font-mono font-bold uppercase ${cameraView === 'ZONE_1' ? 'skeuo-button-active text-cyan-400' : 'text-slate-300'}`}
          >
            ZONE 1
          </button>

          {/* Reset Camera */}
          <button
            onClick={() => handleCameraChange('ISOMETRIC')}
            className="p-1.5 rounded-lg skeuo-button text-slate-300 hover:text-cyan-400"
            title="Reset Camera View"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Three.js 3D Canvas */}
      <Canvas camera={{ position: [0, 10, 14], fov: 45 }} shadows>
        <color attach="background" args={[nightMode ? '#090d16' : '#bae6fd']} />
        {/* Dynamic Day / Night Lighting */}
        <ambientLight intensity={nightMode ? 0.25 : 0.85} />
        <directionalLight
          position={[14, 20, 14]}
          intensity={nightMode ? 0.4 : 1.6}
          color={nightMode ? '#38bdf8' : '#fffbeb'}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        {nightMode && <pointLight position={[0, 6, 0]} color="#00f3ff" intensity={1.5} />}

        {/* Dirt Earth Base */}
        <mesh position={[0, -0.02, 0]} receiveShadow>
          <boxGeometry args={[26, 0.04, 26]} />
          <meshStandardMaterial color={nightMode ? '#1e293b' : '#784620'} roughness={0.9} />
        </mesh>

        {/* Road Pathways */}
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[2.2, 0.02, 25]} />
          <meshStandardMaterial color={nightMode ? '#334155' : '#d7ccc8'} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[25, 0.02, 2.2]} />
          <meshStandardMaterial color={nightMode ? '#334155' : '#d7ccc8'} roughness={0.7} />
        </mesh>

        {/* 3D Renewable Energy Station */}
        <SolarPanelArray position={[-7, 0, 0]} />
        <WindTurbine position={[-7, 0, 6]} />

        {/* Master Pump Station */}
        <MasterPumpStation position={[6.5, 0, 0]} activePumpsCount={activePumpsCount} />

        {/* Feeder Pipelines */}
        <RealisticPipeLine start={[6.5, 0.3, 0]} end={[0, 0.3, 0]} active={activePumpsCount > 0} />
        <RealisticPipeLine start={[0, 0.3, 0]} end={[-2.5, 0.3, -0.5]} active={isWaterFlowingForZone('zone-1')} />
        <RealisticPipeLine start={[0, 0.3, 0]} end={[3.1, 0.3, -0.5]} active={isWaterFlowingForZone('zone-2')} />
        <RealisticPipeLine start={[0, 0.3, 0]} end={[-2.5, 0.3, 5.1]} active={isWaterFlowingForZone('zone-3')} />
        <RealisticPipeLine start={[0, 0.3, 0]} end={[3.1, 0.3, 5.1]} active={isWaterFlowingForZone('zone-4')} />

        {/* PIR Wildlife Intrusion Warning Radar Ring */}
        <WildlifeRadarBeacon active={Boolean(motionAlert)} />

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

        <OrbitControls ref={controlsRef} makeDefault maxPolarAngle={Math.PI / 2.05} minDistance={4} maxDistance={24} />
      </Canvas>
    </div>
  );
}

export default FarmSpatialCanvas;
