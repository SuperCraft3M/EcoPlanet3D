
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingType, StatType } from '../types';
import { BUILDINGS } from '../constants';

interface BuildingMeshProps {
  type: BuildingType;
  position: [number, number, number];
  animationsEnabled: boolean;
  isActive?: boolean;
  isPowered?: boolean;
  efficiency?: number;
  isMenuPreview?: boolean; 
}

export const BuildingMesh: React.FC<BuildingMeshProps> = ({ 
    type, 
    position, 
    animationsEnabled, 
    isActive = true, 
    isPowered = true, 
    efficiency = 1,
    isMenuPreview = false
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const config = BUILDINGS[type];
  
  const isRunning = isMenuPreview || (isActive && isPowered);
  const isWorking = isMenuPreview || (isRunning && efficiency > 0.1); 

  // Calculate scale to fit in preview box ONLY if it is a menu preview
  const meshScale = useMemo(() => {
      if (!isMenuPreview) return 1;
      const maxDim = Math.max(config.scale[0] * config.size[0], config.scale[1], config.scale[2] * config.size[1]);
      // Housing usually needs less downscaling
      if (config.category === 'Habitation') return 1.2 / maxDim;
      return 1.4 / maxDim; 
  }, [config, isMenuPreview]);

  const previewOffset = useMemo(() => {
      if (!isMenuPreview) return 0;
      return -(config.scale[1] * meshScale) / 3;
  }, [config, isMenuPreview, meshScale]);

  // Animations
  useFrame((state, delta) => {
    if (!meshRef.current || !animationsEnabled || !isWorking) return;
    const time = state.clock.elapsedTime;
    
    // Wind Turbines
    if (type === BuildingType.WIND_TURBINE || type === BuildingType.WIND_TURBINE_OFFSHORE) {
      const blades = meshRef.current.getObjectByName('blades'); 
      if (blades) blades.rotation.z -= delta * 5 * efficiency; 
    }

    // Fans (Air Filter, Heaters)
    if (type === BuildingType.AIR_FILTER || type === BuildingType.HEATER || type === BuildingType.COOLER) {
        const fan = meshRef.current.getObjectByName('fan');
        if (fan) fan.rotation.y += delta * 8 * efficiency;
    }

    // Radars / Dishes / Uplinks
    if (type === BuildingType.CLOUD_SEEDER || type === BuildingType.WEATHER_STATION || type === BuildingType.SOLAR_ORBITAL_UPLINK) {
       const rotator = meshRef.current.getObjectByName('rotator');
       if (rotator) rotator.rotation.y += delta * 0.5;
    }

    // Drills
    if (type.includes('MINE') || type === BuildingType.CORE_DRILL) {
        const drill = meshRef.current.getObjectByName('drill');
        if (drill) drill.rotation.y += delta * 3;
    }

    // Sci-Fi Rings
    if (type === BuildingType.FUSION_REACTOR || type === BuildingType.ANTIMATTER_REACTOR) {
        const ring1 = meshRef.current.getObjectByName('ring1');
        const ring2 = meshRef.current.getObjectByName('ring2');
        if (ring1) ring1.rotation.x += delta;
        if (ring2) ring2.rotation.z += delta * 1.2;
    }
    
    // Floating pulse
    if (type === BuildingType.SOLAR_ORBITAL_UPLINK || type === BuildingType.ORBITAL_DOCK) {
         if (!isMenuPreview) meshRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.2; 
         const floater = meshRef.current.getObjectByName('floater');
         if (floater) floater.position.y = 0.5 + Math.sin(time * 2) * 0.1;
    }
    
    // Robot Hive / Data Center Pulse
    if (type === BuildingType.ROBOT_HIVE || type === BuildingType.DATA_CENTER || type === BuildingType.BANK) {
        const core = meshRef.current.getObjectByName('pulse');
        if (core) {
            // Pulse intensity or scale
            const scale = 1 + Math.sin(time * 4) * 0.02;
            core.scale.setScalar(scale);
        }
    }
  });

  if (type === BuildingType.NONE || !config) return null;

  const Geometry = useMemo(() => {
      // --- MATERIALS ---
      const matConcrete = <meshStandardMaterial color="#9ca3af" roughness={0.9} />;
      const matDarkConcrete = <meshStandardMaterial color="#4b5563" roughness={0.9} />;
      const matWhiteConcrete = <meshStandardMaterial color="#e5e7eb" roughness={0.8} />;
      const matSteel = <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />;
      const matDarkMetal = <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.4} />;
      const matGlass = <meshStandardMaterial color="#93c5fd" metalness={0.9} roughness={0.1} transparent opacity={0.6} />;
      const matGlassBlue = <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} transparent opacity={0.8} />;
      const matWood = <meshStandardMaterial color="#78350f" roughness={0.9} />;
      const matWoodLight = <meshStandardMaterial color="#d4a373" roughness={0.9} />;
      const matBrick = <meshStandardMaterial color="#7f1d1d" roughness={0.9} />;
      const matRoofRed = <meshStandardMaterial color="#991b1b" roughness={0.8} />;
      const matGrass = <meshStandardMaterial color="#166534" roughness={1} />;
      const matDirt = <meshStandardMaterial color="#5d4037" roughness={1} />;
      const matWater = <meshStandardMaterial color="#0ea5e9" metalness={0.2} roughness={0.1} transparent opacity={0.8} />;
      const matFoliage = <meshStandardMaterial color="#15803d" roughness={1} />;
      const matSand = <meshStandardMaterial color="#fde68a" roughness={1} />;
      const matFabric = <meshStandardMaterial color="#fcd34d" roughness={1} />; // For Tents
      const matGold = <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.3} />;
      
      // Emissives
      const matEmissiveGreen = <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} />;
      const matEmissiveBlue = <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} />;
      const matEmissiveRed = <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />;
      const matEmissivePurple = <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={3} />;
      const matEmissiveOrange = <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2} />;

      // Dimensions (Base scale comes from constants, but we build geometry relative to unit 1x1 generally)
      const w = config.size[0];
      const d = config.size[1];

      // Helper for Housing Roofs
      const RoofPrism = ({ width, depth, height, mat }: any) => (
          <mesh position={[0, height/2, 0]} rotation={[0, Math.PI/4, 0]}>
              <cylinderGeometry args={[0, width*0.8, height, 4, 1]} />
              {mat}
          </mesh>
      );

      switch (type) {
          // ================= LIVING =================
          case BuildingType.TENT:
              return (
                  <group>
                      <mesh position={[0, 0.25, 0]}>
                          <coneGeometry args={[0.35, 0.5, 4]} />
                          {matFabric}
                      </mesh>
                      <mesh position={[0, 0.02, 0]}>
                          <boxGeometry args={[0.5, 0.05, 0.5]} />
                          {matDirt}
                      </mesh>
                  </group>
              );
          case BuildingType.SHACK:
              return (
                  <group>
                      {/* Wooden Box */}
                      <mesh position={[0, 0.25, 0]}>
                          <boxGeometry args={[0.5, 0.5, 0.5]} />
                          {matWood}
                      </mesh>
                      {/* Slanted Roof */}
                      <mesh position={[0, 0.55, 0]} rotation={[0, 0, 0.2]}>
                           <boxGeometry args={[0.6, 0.1, 0.6]} />
                           {matDarkMetal}
                      </mesh>
                      {/* Door */}
                      <mesh position={[0, 0.15, 0.26]}>
                           <planeGeometry args={[0.15, 0.3]} />
                           <meshStandardMaterial color="#000" />
                      </mesh>
                  </group>
              );
          case BuildingType.HOUSE:
              return (
                  <group>
                      {/* Main Body */}
                      <mesh position={[0, 0.3, 0]}>
                          <boxGeometry args={[0.6, 0.6, 0.6]} />
                          {matWhiteConcrete}
                      </mesh>
                      {/* Roof */}
                      <mesh position={[0, 0.75, 0]} rotation={[0, Math.PI/4, 0]}>
                          <cylinderGeometry args={[0, 0.6, 0.4, 4]} />
                          {matRoofRed}
                      </mesh>
                       {/* Windows */}
                      <mesh position={[0.15, 0.4, 0.31]}>
                           <planeGeometry args={[0.15, 0.15]} />
                           {matGlassBlue}
                      </mesh>
                      <mesh position={[-0.15, 0.4, 0.31]}>
                           <planeGeometry args={[0.15, 0.15]} />
                           {matGlassBlue}
                      </mesh>
                  </group>
              );
          case BuildingType.DUPLEX:
              return (
                  <group>
                      <mesh position={[0, 0.4, 0]}>
                          <boxGeometry args={[0.8, 0.8, 0.5]} />
                          {matBrick}
                      </mesh>
                      {/* Flat Roof with rim */}
                      <mesh position={[0, 0.82, 0]}>
                          <boxGeometry args={[0.85, 0.05, 0.55]} />
                          {matWhiteConcrete}
                      </mesh>
                      {/* Two Doors */}
                      <mesh position={[-0.2, 0.2, 0.26]}>
                           <planeGeometry args={[0.15, 0.4]} />
                           <meshStandardMaterial color="#333" />
                      </mesh>
                      <mesh position={[0.2, 0.2, 0.26]}>
                           <planeGeometry args={[0.15, 0.4]} />
                           <meshStandardMaterial color="#333" />
                      </mesh>
                  </group>
              );
          case BuildingType.APARTMENT:
              return (
                  <group>
                      <mesh position={[0, 0.75, 0]}>
                          <boxGeometry args={[0.7, 1.5, 0.7]} />
                          {matConcrete}
                      </mesh>
                      {/* Balconies */}
                      {[0.4, 0.8, 1.2].map((y, i) => (
                          <mesh key={i} position={[0, y, 0.36]}>
                               <boxGeometry args={[0.5, 0.05, 0.1]} />
                               {matDarkMetal}
                          </mesh>
                      ))}
                  </group>
              );
          case BuildingType.CONDO_COMPLEX:
              return (
                  <group>
                      {/* L Shape */}
                      <mesh position={[-0.2, 0.6, -0.2]}>
                          <boxGeometry args={[0.6, 1.2, 0.6]} />
                          {matWhiteConcrete}
                      </mesh>
                      <mesh position={[0.3, 0.4, 0.3]}>
                          <boxGeometry args={[0.6, 0.8, 0.6]} />
                          {matWhiteConcrete}
                      </mesh>
                      {/* Pool */}
                      <mesh position={[0.4, 0.05, -0.4]}>
                          <boxGeometry args={[0.5, 0.1, 0.5]} />
                          {matWater}
                      </mesh>
                  </group>
              );
          case BuildingType.SKYSCRAPER:
              return (
                  <group>
                      <mesh position={[0, 1.5, 0]}>
                          <boxGeometry args={[0.8, 3, 0.8]} />
                          {matGlassBlue}
                      </mesh>
                      {/* Structural Frame */}
                      <mesh position={[0, 1.5, 0]}>
                           <boxGeometry args={[0.85, 0.1, 0.85]} />
                           {matSteel}
                      </mesh>
                      <mesh position={[0, 2.5, 0]}>
                           <boxGeometry args={[0.85, 0.1, 0.85]} />
                           {matSteel}
                      </mesh>
                      <mesh position={[0, 0.5, 0]}>
                           <boxGeometry args={[0.85, 0.1, 0.85]} />
                           {matSteel}
                      </mesh>
                  </group>
              );
          case BuildingType.ARCOLOGY:
              return (
                  <group>
                      {/* Base */}
                      <mesh position={[0, 0.2, 0]}>
                          <cylinderGeometry args={[1.5, 1.8, 0.4, 6]} />
                          {matWhiteConcrete}
                      </mesh>
                      {/* Tower */}
                      <mesh position={[0, 1.5, 0]}>
                          <coneGeometry args={[1.2, 3, 6]} />
                          {matGlass}
                      </mesh>
                      {/* Green Rings */}
                      <mesh position={[0, 1, 0]}>
                           <torusGeometry args={[1.0, 0.1, 8, 6]} />
                           {matFoliage}
                      </mesh>
                      <mesh position={[0, 1.8, 0]}>
                           <torusGeometry args={[0.7, 0.1, 8, 6]} />
                           {matFoliage}
                      </mesh>
                  </group>
              );
           case BuildingType.DOME_CITY:
               return (
                   <group>
                       <mesh position={[0, 0, 0]}>
                           <sphereGeometry args={[1.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                           {matGlassBlue}
                       </mesh>
                       {/* Internal Buildings visible through glass */}
                       <mesh position={[0.5, 0, 0.5]}>
                           <boxGeometry args={[0.3, 0.8, 0.3]} />
                           {matWhiteConcrete}
                       </mesh>
                        <mesh position={[-0.5, 0, -0.2]}>
                           <boxGeometry args={[0.4, 0.6, 0.4]} />
                           {matWhiteConcrete}
                       </mesh>
                   </group>
               );
            case BuildingType.UNDERGROUND_BUNKER:
                return (
                    <group>
                         {/* Hatch */}
                         <mesh position={[0, 0.05, 0]}>
                             <cylinderGeometry args={[0.4, 0.4, 0.1, 8]} />
                             {matDarkMetal}
                         </mesh>
                         <mesh position={[0, 0.1, 0]}>
                             <cylinderGeometry args={[0.15, 0.15, 0.1, 6]} />
                             {matSteel}
                         </mesh>
                         {/* Vent */}
                         <mesh position={[0.3, 0.2, -0.3]}>
                              <boxGeometry args={[0.2, 0.4, 0.2]} />
                              {matConcrete}
                         </mesh>
                    </group>
                );
            case BuildingType.HOTEL:
                return (
                    <group>
                        <mesh position={[0, 1, 0]}>
                             <boxGeometry args={[1.2, 2, 0.6]} />
                             {matGlass}
                        </mesh>
                        <mesh position={[0, 1, 0]}>
                             <boxGeometry args={[1.1, 2, 0.5]} />
                             {matWhiteConcrete}
                        </mesh>
                        <mesh position={[0, 2.1, 0]}>
                             <boxGeometry args={[1.2, 0.1, 0.8]} />
                             <meshStandardMaterial color="#e11d48" />
                        </mesh>
                    </group>
                );
            case BuildingType.MALL:
                return (
                    <group>
                        <mesh position={[0, 0.3, 0]}>
                             <boxGeometry args={[1.8, 0.6, 1.4]} />
                             {matWhiteConcrete}
                        </mesh>
                        {/* Skylights */}
                        <mesh position={[-0.5, 0.65, 0]}>
                             <cylinderGeometry args={[0.3, 0.3, 0.1, 4]} />
                             {matGlassBlue}
                        </mesh>
                        <mesh position={[0.5, 0.65, 0]}>
                             <cylinderGeometry args={[0.3, 0.3, 0.1, 4]} />
                             {matGlassBlue}
                        </mesh>
                        {/* Entrance */}
                        <mesh position={[0, 0.2, 0.7]}>
                             <boxGeometry args={[0.6, 0.4, 0.1]} />
                             {matGlass}
                        </mesh>
                    </group>
                );
            case BuildingType.ROBOT_HIVE:
                return (
                    <group>
                        {/* Hexagonal Tower */}
                        <mesh position={[0, 0.8, 0]}>
                            <cylinderGeometry args={[0.6, 0.8, 1.6, 6]} />
                            {matDarkMetal}
                        </mesh>
                        {/* Glowing Eyes/Slots */}
                         <mesh position={[0, 0.8, 0]} name="pulse">
                             <cylinderGeometry args={[0.61, 0.81, 0.1, 6]} />
                             {matEmissiveRed}
                        </mesh>
                         <mesh position={[0, 1.2, 0]} name="pulse">
                             <cylinderGeometry args={[0.55, 0.65, 0.1, 6]} />
                             {matEmissiveRed}
                        </mesh>
                    </group>
                );


          // ================= NATURE =================
          case BuildingType.SMALL_TREE:
              return (
                  <group>
                      <mesh position={[0, 0.15, 0]}>
                          <cylinderGeometry args={[0.05, 0.08, 0.3]} />
                          {matWood}
                      </mesh>
                      <mesh position={[0, 0.4, 0]}>
                          <dodecahedronGeometry args={[0.25]} />
                          {matFoliage}
                      </mesh>
                  </group>
              );
          case BuildingType.LARGE_TREE:
              return (
                  <group>
                      <mesh position={[0, 0.4, 0]}>
                          <cylinderGeometry args={[0.1, 0.15, 0.8]} />
                          {matWood}
                      </mesh>
                      <mesh position={[0, 1, 0]}>
                           <dodecahedronGeometry args={[0.4]} />
                           {matFoliage}
                      </mesh>
                      <mesh position={[0.3, 0.7, 0]}>
                           <dodecahedronGeometry args={[0.25]} />
                           {matFoliage}
                      </mesh>
                      <mesh position={[-0.2, 0.8, 0.2]}>
                           <dodecahedronGeometry args={[0.3]} />
                           {matFoliage}
                      </mesh>
                  </group>
              );
          case BuildingType.FOREST_GROVE:
              return (
                  <group>
                       <group position={[-0.2, 0, -0.2]} scale={[0.8, 0.8, 0.8]}>
                           <mesh position={[0, 0.4, 0]}>
                               <cylinderGeometry args={[0.1, 0.15, 0.8]} />
                               {matWood}
                           </mesh>
                           <mesh position={[0, 1, 0]}>
                               <dodecahedronGeometry args={[0.4]} />
                               {matFoliage}
                           </mesh>
                       </group>
                       <group position={[0.3, 0, 0.3]} scale={[0.6, 0.6, 0.6]}>
                           <mesh position={[0, 0.4, 0]}>
                               <cylinderGeometry args={[0.1, 0.15, 0.8]} />
                               {matWood}
                           </mesh>
                           <mesh position={[0, 1, 0]}>
                               <dodecahedronGeometry args={[0.4]} />
                               {matFoliage}
                           </mesh>
                       </group>
                       <group position={[-0.3, 0, 0.2]} scale={[0.7, 0.7, 0.7]}>
                           <mesh position={[0, 0.4, 0]}>
                               <cylinderGeometry args={[0.1, 0.15, 0.8]} />
                               {matWood}
                           </mesh>
                           <mesh position={[0, 1, 0]}>
                               <dodecahedronGeometry args={[0.4]} />
                               {matFoliage}
                           </mesh>
                       </group>
                  </group>
              );
          case BuildingType.PARK:
              return (
                  <group>
                       <mesh position={[0, 0.05, 0]}>
                           <boxGeometry args={[1.9, 0.1, 1.9]} />
                           {matGrass}
                       </mesh>
                       {/* Fountain */}
                       <mesh position={[0, 0.15, 0]}>
                           <cylinderGeometry args={[0.5, 0.5, 0.2]} />
                           {matWhiteConcrete}
                       </mesh>
                       <mesh position={[0, 0.2, 0]}>
                           <cylinderGeometry args={[0.4, 0.4, 0.1]} />
                           {matWater}
                       </mesh>
                       {/* Benches */}
                       <mesh position={[0.7, 0.15, 0]}>
                           <boxGeometry args={[0.1, 0.1, 0.4]} />
                           {matWood}
                       </mesh>
                       <mesh position={[-0.7, 0.15, 0]}>
                           <boxGeometry args={[0.1, 0.1, 0.4]} />
                           {matWood}
                       </mesh>
                  </group>
              );
          case BuildingType.LAKE:
              return (
                  <group>
                      <mesh position={[0, 0.05, 0]}>
                          <boxGeometry args={[1.9, 0.1, 1.9]} />
                          {matSand}
                      </mesh>
                      <mesh position={[0, 0.1, 0]}>
                          <cylinderGeometry args={[0.8, 0.8, 0.1, 8]} />
                          {matWater}
                      </mesh>
                      <mesh position={[0.5, 0.1, 0.5]}>
                          <cylinderGeometry args={[0.4, 0.4, 0.1, 8]} />
                          {matWater}
                      </mesh>
                  </group>
              );
           case BuildingType.RAIN_COLLECTOR:
               return (
                   <group>
                        {/* Funnel */}
                        <mesh position={[0, 0.6, 0]}>
                            <cylinderGeometry args={[0.6, 0.1, 0.5, 8, 1, true]} />
                            <meshStandardMaterial color="#60a5fa" side={THREE.DoubleSide} metalness={0.5} />
                        </mesh>
                        {/* Tank */}
                        <mesh position={[0, 0.2, 0]}>
                             <cylinderGeometry args={[0.3, 0.3, 0.4]} />
                             {matDarkMetal}
                        </mesh>
                        {/* Legs */}
                        <mesh position={[0.3, 0.3, 0]}>
                             <cylinderGeometry args={[0.02, 0.02, 0.6]} />
                             {matSteel}
                        </mesh>
                        <mesh position={[-0.3, 0.3, 0]}>
                             <cylinderGeometry args={[0.02, 0.02, 0.6]} />
                             {matSteel}
                        </mesh>
                   </group>
               );
            case BuildingType.WATER_TANK:
                return (
                    <group>
                        {/* Large Sphere Tank */}
                        <mesh position={[0, 0.8, 0]}>
                            <sphereGeometry args={[0.5, 16, 16]} />
                            {matWhiteConcrete}
                        </mesh>
                        <mesh position={[0, 0.8, 0]}>
                            <cylinderGeometry args={[0.51, 0.51, 0.1]} />
                            <meshStandardMaterial color="#0ea5e9" />
                        </mesh>
                        {/* Support Lattice */}
                        <mesh position={[0, 0.4, 0]}>
                             <cylinderGeometry args={[0.3, 0.4, 0.8, 4, 1, true]} />
                             <meshStandardMaterial color="#475569" wireframe />
                        </mesh>
                    </group>
                );

          // ================= TERRAFORM =================
          case BuildingType.AIR_FILTER:
              return (
                  <group>
                      {/* Housing */}
                      <mesh position={[0, 0.4, 0]}>
                          <boxGeometry args={[0.6, 0.8, 0.6]} />
                          {matWhiteConcrete}
                      </mesh>
                      {/* Fan Grill */}
                      <mesh position={[0, 0.4, 0.31]}>
                           <circleGeometry args={[0.25]} />
                           <meshStandardMaterial color="#333" wireframe />
                      </mesh>
                      {/* Blades */}
                      <mesh position={[0, 0.4, 0.3]} name="fan">
                           <boxGeometry args={[0.4, 0.05, 0.02]} />
                           <meshStandardMaterial color="#999" />
                           <mesh rotation={[0, 0, Math.PI/2]}>
                               <boxGeometry args={[0.4, 0.05, 0.02]} />
                               <meshStandardMaterial color="#999" />
                           </mesh>
                      </mesh>
                  </group>
              );
          case BuildingType.CO2_SCRUBBER:
              return (
                  <group>
                      {/* Tanks */}
                      <mesh position={[-0.4, 0.6, 0]}>
                          <cylinderGeometry args={[0.3, 0.3, 1.2]} />
                          {matDarkMetal}
                      </mesh>
                      <mesh position={[0.4, 0.6, 0]}>
                          <cylinderGeometry args={[0.3, 0.3, 1.2]} />
                          {matDarkMetal}
                      </mesh>
                      {/* Pipes */}
                      <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI/2]}>
                           <cylinderGeometry args={[0.1, 0.1, 0.8]} />
                           {matSteel}
                      </mesh>
                  </group>
              );
          case BuildingType.WEATHER_STATION:
              return (
                  <group>
                      <mesh position={[0, 0.8, 0]}>
                          <cylinderGeometry args={[0.05, 0.05, 1.6]} />
                          {matSteel}
                      </mesh>
                      {/* Radar Dish */}
                      <group position={[0, 1.6, 0]} name="rotator">
                           <mesh rotation={[0.5, 0, 0]}>
                               <sphereGeometry args={[0.3, 16, 8, 0, Math.PI*2, 0, Math.PI/2]} />
                               {matWhiteConcrete}
                           </mesh>
                      </group>
                  </group>
              );
           case BuildingType.CLOUD_SEEDER:
               return (
                   <group>
                       <mesh position={[0, 0.2, 0]}>
                           <boxGeometry args={[1, 0.4, 1]} />
                           {matConcrete}
                       </mesh>
                       {/* Cannons */}
                       <group name="rotator">
                            <mesh position={[0, 0.5, 0]} rotation={[Math.PI/4, 0, 0]}>
                                 <cylinderGeometry args={[0.1, 0.15, 0.8]} />
                                 {matDarkMetal}
                            </mesh>
                            <mesh position={[0.3, 0.5, 0]} rotation={[Math.PI/4, 0, 0.5]}>
                                 <cylinderGeometry args={[0.1, 0.15, 0.8]} />
                                 {matDarkMetal}
                            </mesh>
                       </group>
                   </group>
               );
            case BuildingType.TECTONIC_STABILIZER:
                return (
                    <group>
                        {/* Heavy Base */}
                        <mesh position={[0, 0.2, 0]}>
                            <boxGeometry args={[2, 0.4, 2]} />
                            {matDarkConcrete}
                        </mesh>
                        {/* Piston */}
                        <mesh position={[0, 1, 0]}>
                            <cylinderGeometry args={[0.5, 0.5, 1.5]} />
                            {matSteel}
                        </mesh>
                        {/* Clamps */}
                        <mesh position={[1, 0.5, 0]}>
                            <boxGeometry args={[0.5, 1, 0.5]} />
                            {matEmissiveOrange}
                        </mesh>
                        <mesh position={[-1, 0.5, 0]}>
                            <boxGeometry args={[0.5, 1, 0.5]} />
                            {matEmissiveOrange}
                        </mesh>
                    </group>
                );

          // ================= CIVIC =================
          case BuildingType.SCHOOL:
              return (
                  <group>
                      <mesh position={[0, 0.4, 0]}>
                          <boxGeometry args={[1.2, 0.6, 0.8]} />
                          {matBrick}
                      </mesh>
                      {/* Clock Tower */}
                      <mesh position={[0, 0.8, 0]}>
                          <boxGeometry args={[0.3, 0.8, 0.3]} />
                          {matWhiteConcrete}
                      </mesh>
                      {/* Clock Face */}
                      <mesh position={[0, 1, 0.16]}>
                          <circleGeometry args={[0.1]} />
                          {matWhiteConcrete}
                      </mesh>
                  </group>
              );
          case BuildingType.UNIVERSITY:
              return (
                   <group>
                       {/* Main Hall */}
                       <mesh position={[0, 0.6, -0.3]}>
                           <boxGeometry args={[1.2, 1, 0.8]} />
                           {matBrick}
                       </mesh>
                       <mesh position={[0, 1.2, -0.3]}>
                            <coneGeometry args={[0.6, 0.5, 4]} />
                            {matDarkMetal}
                       </mesh>
                       {/* Wings */}
                       <mesh position={[-0.6, 0.4, 0.2]}>
                           <boxGeometry args={[0.6, 0.6, 1]} />
                           {matBrick}
                       </mesh>
                       <mesh position={[0.6, 0.4, 0.2]}>
                           <boxGeometry args={[0.6, 0.6, 1]} />
                           {matBrick}
                       </mesh>
                   </group>
              );
          case BuildingType.HOSPITAL:
              return (
                  <group>
                      <mesh position={[0, 0.6, 0]}>
                          <boxGeometry args={[1.4, 1.2, 1.2]} />
                          {matWhiteConcrete}
                      </mesh>
                      {/* Red Cross */}
                      <mesh position={[0, 0.8, 0.61]}>
                          <boxGeometry args={[0.4, 0.1, 0.02]} />
                          {matEmissiveRed}
                      </mesh>
                      <mesh position={[0, 0.8, 0.61]}>
                          <boxGeometry args={[0.1, 0.4, 0.02]} />
                          {matEmissiveRed}
                      </mesh>
                  </group>
              );
          case BuildingType.BANK:
              return (
                  <group>
                       {/* Pillars */}
                       <mesh position={[-0.5, 0.5, 0.6]}>
                           <cylinderGeometry args={[0.1, 0.1, 1]} />
                           {matWhiteConcrete}
                       </mesh>
                       <mesh position={[0, 0.5, 0.6]}>
                           <cylinderGeometry args={[0.1, 0.1, 1]} />
                           {matWhiteConcrete}
                       </mesh>
                       <mesh position={[0.5, 0.5, 0.6]}>
                           <cylinderGeometry args={[0.1, 0.1, 1]} />
                           {matWhiteConcrete}
                       </mesh>
                       {/* Main Block */}
                       <mesh position={[0, 0.5, -0.2]}>
                           <boxGeometry args={[1.4, 1, 1.4]} />
                           {matConcrete}
                       </mesh>
                       {/* Roof */}
                       <mesh position={[0, 1.1, 0]}>
                           <boxGeometry args={[1.5, 0.2, 1.5]} />
                           {matDarkConcrete}
                       </mesh>
                       {/* Vault Light */}
                       <mesh position={[0, 1.3, 0]} name="pulse">
                            <sphereGeometry args={[0.2]} />
                            {matEmissiveOrange}
                       </mesh>
                  </group>
              );
          case BuildingType.DATA_CENTER:
               return (
                   <group>
                       <mesh position={[0, 0.4, 0]}>
                           <boxGeometry args={[1.8, 0.8, 0.8]} />
                           {matDarkMetal}
                       </mesh>
                       {/* Server Lights */}
                       <mesh position={[-0.6, 0.4, 0.41]} name="pulse">
                            <planeGeometry args={[0.4, 0.6]} />
                            <meshStandardMaterial color="#00ff00" emissive="#00ff00" />
                       </mesh>
                       <mesh position={[0, 0.4, 0.41]} name="pulse">
                            <planeGeometry args={[0.4, 0.6]} />
                            <meshStandardMaterial color="#00ff00" emissive="#00ff00" />
                       </mesh>
                       <mesh position={[0.6, 0.4, 0.41]} name="pulse">
                            <planeGeometry args={[0.4, 0.6]} />
                            <meshStandardMaterial color="#00ff00" emissive="#00ff00" />
                       </mesh>
                       {/* Cooling Units on Roof */}
                       <mesh position={[0.5, 0.9, 0]}>
                            <boxGeometry args={[0.4, 0.2, 0.4]} />
                            {matSteel}
                       </mesh>
                       <mesh position={[-0.5, 0.9, 0]}>
                            <boxGeometry args={[0.4, 0.2, 0.4]} />
                            {matSteel}
                       </mesh>
                   </group>
               );

          // ================= FALLBACK & PREVIOUS =================
          // Keep previous implementation for mines/energy for completeness, 
          // simplified here for brevity but assuming they are handled above or fall through
          // Copying Energy/Industry from previous step if needed, but user asked to fix BROKEN ones.
          // I will include the Energy/Industry cases again to ensure file is complete.

          case BuildingType.MINE_IRON:
          case BuildingType.MINE_SILICON:
          case BuildingType.MINE_GOLD:
          case BuildingType.MINE_TITANIUM:
          case BuildingType.MINE_LITHIUM:
          case BuildingType.MINE_URANIUM:
          case BuildingType.CORE_DRILL:
              return (
                  <group>
                      <mesh position={[0, 0.1, 0]}>
                          <boxGeometry args={[w, 0.2, d]} />
                          {matDarkConcrete}
                      </mesh>
                      <mesh position={[-0.35, 0.6, 0]} rotation={[0, 0, -0.2]}>
                          <boxGeometry args={[0.1, 1.2, 0.1]} />
                          {matSteel}
                      </mesh>
                      <mesh position={[0.35, 0.6, 0]} rotation={[0, 0, 0.2]}>
                          <boxGeometry args={[0.1, 1.2, 0.1]} />
                          {matSteel}
                      </mesh>
                      <mesh position={[0, 1.1, 0]}>
                          <boxGeometry args={[0.6, 0.1, 0.2]} />
                          {matDarkMetal}
                      </mesh>
                      <group position={[0, 0.5, 0]} name="drill">
                           <mesh>
                               <cylinderGeometry args={[0.15, 0.05, 1, 8]} />
                               {matDarkMetal}
                           </mesh>
                           <mesh position={[0, -0.4, 0]}>
                               <coneGeometry args={[0.2, 0.3, 8]} />
                               <meshStandardMaterial color="silver" metalness={0.8} roughness={0.2} />
                           </mesh>
                      </group>
                      <mesh position={[0.3, 0.25, 0.3]}>
                          <dodecahedronGeometry args={[0.2]} />
                          {type === BuildingType.MINE_GOLD ? matGold : matDarkConcrete}
                      </mesh>
                  </group>
              );

          case BuildingType.COAL_PLANT:
              return (
                  <group>
                       <mesh position={[0, 0.4, 0]}>
                           <boxGeometry args={[w*0.8, 0.8, d*0.8]} />
                           {matBrick}
                       </mesh>
                       <mesh position={[0, 0.1, 0]}>
                           <boxGeometry args={[w, 0.2, d]} />
                           {matDarkConcrete}
                       </mesh>
                       <mesh position={[-0.5, 1.2, 0.5]}>
                           <cylinderGeometry args={[0.15, 0.2, 1.5]} />
                           {matConcrete}
                       </mesh>
                       <mesh position={[0.5, 1.2, -0.5]}>
                           <cylinderGeometry args={[0.15, 0.2, 1.5]} />
                           {matConcrete}
                       </mesh>
                  </group>
              );

          case BuildingType.GAS_PLANT:
              return (
                  <group>
                      <mesh position={[0, 0.1, 0]}>
                          <boxGeometry args={[w, 0.2, d]} />
                          {matConcrete}
                      </mesh>
                      <mesh position={[-0.5, 0.5, -0.5]}>
                          <sphereGeometry args={[0.45, 16, 16]} />
                          {matWhiteConcrete}
                      </mesh>
                      <mesh position={[0.5, 0.5, 0.5]}>
                          <sphereGeometry args={[0.45, 16, 16]} />
                          {matWhiteConcrete}
                      </mesh>
                      <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI/4, 0]}>
                          <cylinderGeometry args={[0.1, 0.1, 1.5]} />
                          {matSteel}
                      </mesh>
                  </group>
              );
              
           case BuildingType.NUCLEAR_PLANT:
                return (
                    <group>
                        {/* Cooling Tower */}
                         <mesh position={[0, 1, 0]}>
                             <cylinderGeometry args={[0.6, 1, 2, 16, 1, true]} />
                             {matConcrete}
                         </mesh>
                         {/* Reactor Building */}
                         <mesh position={[0.8, 0.5, 0.8]}>
                             <sphereGeometry args={[0.5, 16, 16, 0, Math.PI*2, 0, Math.PI/2]} />
                             {matWhiteConcrete}
                         </mesh>
                    </group>
                );

           case BuildingType.SOLAR_ORBITAL_UPLINK:
              return (
                  <group>
                      <mesh position={[0, 0.1, 0]}>
                          <boxGeometry args={[w, 0.2, d]} />
                          {matDarkMetal}
                      </mesh>
                      <mesh position={[0, 0.6, 0]}>
                          <coneGeometry args={[0.8, 1.2, 4]} />
                          {matDarkMetal}
                      </mesh>
                      <mesh position={[0, 1.8, 0]} name="rotator">
                          <octahedronGeometry args={[0.6]} />
                          {isWorking ? matEmissiveBlue : matGlass}
                      </mesh>
                  </group>
              );

          case BuildingType.FUSION_REACTOR:
          case BuildingType.ANTIMATTER_REACTOR:
              const isAnti = type === BuildingType.ANTIMATTER_REACTOR;
              return (
                  <group>
                      <mesh position={[0, 0.1, 0]}>
                          <boxGeometry args={[w, 0.2, d]} />
                          {matDarkConcrete}
                      </mesh>
                      <mesh position={[0, 0.5, 0]}>
                          <cylinderGeometry args={[0.8, 1, 0.8, 8]} />
                          {matDarkConcrete}
                      </mesh>
                      <group position={[0, 1.2, 0]} name="rotator">
                           <mesh rotation={[0.5, 0, 0]} name="ring1">
                               <torusGeometry args={[0.7, 0.1, 16, 32]} />
                               {matSteel}
                           </mesh>
                           <mesh rotation={[-0.5, 0, 0]} name="ring2">
                               <torusGeometry args={[0.9, 0.1, 16, 32]} />
                               {matSteel}
                           </mesh>
                      </group>
                      <mesh position={[0, 1.2, 0]} name="core">
                          <sphereGeometry args={[0.4, 16, 16]} />
                          {isAnti ? matEmissivePurple : matEmissiveOrange}
                      </mesh>
                  </group>
              );
          
          case BuildingType.ORBITAL_DOCK:
               return (
                   <group>
                       <mesh position={[0, 1, 0]} name="floater">
                           <cylinderGeometry args={[1.5, 1.2, 0.2, 6]} />
                           {matSteel}
                       </mesh>
                       <mesh position={[0, 0.1, 0]}>
                           <torusGeometry args={[1.2, 0.1, 16, 32]} />
                           <meshStandardMaterial color="#64748b" />
                       </mesh>
                   </group>
               );

          case BuildingType.FACTORY_AEROSPACE:
              return (
                  <group>
                      <mesh position={[0, 0.8, 0]} rotation={[Math.PI/2, 0, 0]}>
                          <cylinderGeometry args={[1, 1, 2.5, 32, 1, false, 0, Math.PI]} />
                          {matSteel}
                      </mesh>
                       <mesh position={[0, 0.05, 0]}>
                          <boxGeometry args={[w, 0.1, d]} />
                          {matDarkConcrete}
                      </mesh>
                  </group>
              );
              
          case BuildingType.DEPOLLUTION_NODE_SMALL:
          case BuildingType.DEPOLLUTION_NODE_LARGE:
              return (
                  <group>
                      <mesh position={[0, 0.5, 0]}>
                          <cylinderGeometry args={[0.2, 0.4, 1, 6]} />
                          {matWhiteConcrete}
                      </mesh>
                      <mesh position={[0, 1, 0]} name="pulse">
                           <sphereGeometry args={[0.3]} />
                           {matEmissiveGreen}
                      </mesh>
                  </group>
              );

          case BuildingType.FACTORY_SMALL:
          case BuildingType.FACTORY_LARGE:
          case BuildingType.FACTORY_ROBOTICS:
          case BuildingType.FACTORY_CHIP:
              return (
                  <group>
                      <mesh position={[0, 0.5, 0]}>
                          <boxGeometry args={[w*0.9, 1, d*0.9]} />
                          {matDarkConcrete}
                      </mesh>
                      <mesh position={[0.3, 1.2, 0.3]}>
                          <cylinderGeometry args={[0.15, 0.2, 0.8]} />
                          {matSteel}
                      </mesh>
                  </group>
              );
          
          case BuildingType.WIND_TURBINE:
          case BuildingType.WIND_TURBINE_OFFSHORE:
              return (
                  <group>
                       <mesh position={[0, 1, 0]}>
                           <cylinderGeometry args={[0.05, 0.15, 2]} />
                           {matWhiteConcrete}
                       </mesh>
                       <group position={[0, 2, 0.1]} name="blades">
                            <mesh position={[0, 0.8, 0]}>
                                <boxGeometry args={[0.1, 1.6, 0.05]} />
                                {matWhiteConcrete}
                            </mesh>
                            <mesh position={[0.7, -0.4, 0]} rotation={[0,0, 2.1]}>
                                <boxGeometry args={[0.1, 1.6, 0.05]} />
                                {matWhiteConcrete}
                            </mesh>
                            <mesh position={[-0.7, -0.4, 0]} rotation={[0,0, -2.1]}>
                                <boxGeometry args={[0.1, 1.6, 0.05]} />
                                {matWhiteConcrete}
                            </mesh>
                       </group>
                  </group>
              );

          default:
              // SOLAR PANELS
              if (type === BuildingType.SOLAR_PANEL_SMALL || type === BuildingType.SOLAR_PANEL_LARGE) {
                  return (
                    <group>
                        <mesh position={[0, 0.05, 0]}>
                            <boxGeometry args={[w*0.2, 0.1, d*0.2]} />
                            {matDarkMetal}
                        </mesh>
                        <mesh position={[0, 0.15, 0]}>
                            <cylinderGeometry args={[0.05, 0.05, 0.2]} />
                            {matSteel}
                        </mesh>
                        <group position={[0, 0.3, 0]} rotation={[-0.4, 0, 0]}>
                            <mesh>
                                <boxGeometry args={[config.scale[0], 0.05, config.scale[2]]} />
                                {matDarkMetal}
                            </mesh>
                            <mesh position={[0, 0.03, 0]}>
                                <boxGeometry args={[config.scale[0]*0.9, 0.01, config.scale[2]*0.9]} />
                                <meshStandardMaterial color="#2563eb" metalness={0.8} roughness={0.2} />
                            </mesh>
                        </group>
                    </group>
                  )
              }
              
              // FINAL FALLBACK
              return (
                  <group>
                      <mesh position={[0, config.scale[1]/2, 0]}>
                          <boxGeometry args={[config.scale[0] * w, config.scale[1], config.scale[2] * d]} />
                          <meshStandardMaterial color={config.color || "#fff"} />
                      </mesh>
                  </group>
              );
      }
  }, [type, config, isWorking, isMenuPreview]);

  return (
    <group 
        ref={meshRef} 
        position={position} 
        scale={[meshScale, meshScale, meshScale]}
    >
      <group position={[0, previewOffset, 0]}>
        {Geometry}
      </group>
    </group>
  );
};
