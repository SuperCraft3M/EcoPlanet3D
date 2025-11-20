
import React, { useState } from 'react';
import { GridPosition, Cell, BuildingType } from '../types';
import { GRID_SIZE, BUILDINGS } from '../constants';
import { BuildingMesh } from './BuildingMesh';
import * as THREE from 'three';

interface GridProps {
  grid: Cell[][];
  onCellClick: (pos: GridPosition) => void;
  hoverBuilding: BuildingType;
  animationsEnabled: boolean;
  isRaining: boolean;
}

export const Grid: React.FC<GridProps> = ({ grid, onCellClick, hoverBuilding, animationsEnabled, isRaining }) => {
  const [hoverPos, setHoverPos] = useState<GridPosition | null>(null);

  const getTileColor = (cell: Cell, x: number, y: number) => {
     // Check if this cell is part of the hover footprint
     let isHovered = false;
     let isBlocked = false;

     if (hoverPos && hoverBuilding !== BuildingType.NONE) {
         if (hoverBuilding === BuildingType.BULLDOZER) {
             // Bulldozer: Hovered if this exact cell is hovered
             if (hoverPos.x === x && hoverPos.y === y) isHovered = true;
         } else {
             // Building Placement: Check footprint
             const def = BUILDINGS[hoverBuilding];
             const [w, d] = def.size;
             
             // Check if (x, y) is inside the rectangle starting at hoverPos
             if (x >= hoverPos.x && x < hoverPos.x + w && y >= hoverPos.y && y < hoverPos.y + d) {
                 isHovered = true;
                 // If out of bounds or occupied, it's blocked
                 if (hoverPos.x + w > GRID_SIZE || hoverPos.y + d > GRID_SIZE) {
                    isBlocked = true;
                 } else {
                     // We are inside the potential placement rect.
                     // We need to check if ANY cell in this rect is occupied.
                     // But visual feedback is per cell.
                     // If cell is occupied, it's blocked.
                     if (cell.building) isBlocked = true;
                 }
             }
         }
     }

     if (isHovered) {
         if (hoverBuilding === BuildingType.BULLDOZER && cell.building) return '#ff0000';
         if (isBlocked) return '#ff4444';
         return '#ffd700';
     }
     
     // Lighter pollution color for better visibility against dark background
     if (cell.pollution > 0) {
        const p = Math.min(100, cell.pollution) / 100;
        if (p > 0.7) return '#3d3d29'; // Lighter dark olive
        if (p > 0.3) return '#6b6354'; // Lighter muddy brown
     }

     if (cell.building) return '#444'; // Slightly lighter grey for under buildings
     
     // Wet ground effect
     if (isRaining) return '#6d5047'; // Lighter brown

     return '#A0522D'; // Sienna (Lighter than SaddleBrown)
  };

  // Ghost Logic: Only render Ghost if we are the Top-Left of the hover area
  const renderGhost = (x: number, y: number) => {
      if (!hoverPos || hoverBuilding === BuildingType.NONE || hoverBuilding === BuildingType.BULLDOZER) return null;
      
      // We only render the ghost mesh at the hover anchor position
      if (x === hoverPos.x && y === hoverPos.y) {
          const def = BUILDINGS[hoverBuilding];
          const [w, d] = def.size;
          
          // Calculate center offset relative to the anchor cell center (0,0)
          // Anchor cell is x,y. Its visual center is 0,0 in local group.
          // Building needs to be centered over w,d.
          // Center of w is (w-1)/2 * 1 unit.
          const offsetX = (w - 1) / 2;
          const offsetZ = (d - 1) / 2;

          // Check valid placement for color/opacity
          let isValid = true;
          if (x + w > GRID_SIZE || y + d > GRID_SIZE) isValid = false;
          else {
               for(let i=0; i<w; i++){
                   for(let j=0; j<d; j++){
                       if(grid[x+i][y+j].building) isValid = false;
                   }
               }
          }

          // Calculate Range for Visual
          const pollutionRadius = def.pollutionRadius;
          // Determine if it is bad pollution or depollution (or generic range)
          // If it has pollutionAmount > 0, it's bad. Else if pollutionCapReduction, it's good.
          const isPollution = def.pollutionAmount && def.pollutionAmount > 0;
          const rangeColor = isPollution ? "#ff0000" : "#00ffff";
          const hasRadius = pollutionRadius && pollutionRadius > 0;

          return (
             <group position={[offsetX, 0, offsetZ]}>
                {/* Building Ghost */}
                <group opacity={0.6} transparent>
                    <BuildingMesh 
                        type={hoverBuilding} 
                        position={[0, 0, 0]} 
                        animationsEnabled={animationsEnabled} 
                    />
                </group>

                {/* Validity Indicator Box */}
                {!isValid && (
                     <mesh position={[0, 0.5, 0]}>
                         <boxGeometry args={[w, 1, d]} />
                         <meshBasicMaterial color="red" transparent opacity={0.3} />
                     </mesh>
                )}

                {/* Range Overlay */}
                {isValid && hasRadius && (
                    <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[pollutionRadius, pollutionRadius + 0.2, 64]} />
                        <meshBasicMaterial color={rangeColor} transparent opacity={0.5} side={THREE.DoubleSide} />
                    </mesh>
                )}
                {isValid && hasRadius && (
                    <mesh position={[0, 0.05, 0]}>
                         <cylinderGeometry args={[pollutionRadius, pollutionRadius, 0.5, 64, 1, true]} />
                         <meshBasicMaterial color={rangeColor} transparent opacity={0.1} side={THREE.DoubleSide} />
                    </mesh>
                )}
             </group>
          )
      }
      return null;
  };

  return (
    <group position={[-GRID_SIZE / 2, 0, -GRID_SIZE / 2]}>
      {grid.map((row, x) =>
        row.map((cell, y) => {
          const isAnchor = cell.building && cell.x === cell.refX && cell.y === cell.refY;
          
          return (
            <group key={`${x}-${y}`} position={[x + 0.5, 0, y + 0.5]}>
              {/* Ground */}
              <mesh
                position={[0, -0.1, 0]}
                receiveShadow
                onClick={(e) => {
                  e.stopPropagation();
                  onCellClick({ x, y });
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoverPos({ x, y });
                }}
                onPointerOut={() => setHoverPos(null)}
              >
                <boxGeometry args={[0.95, 0.2, 0.95]} />
                <meshStandardMaterial color={getTileColor(cell, x, y)} roughness={isRaining ? 0.3 : 0.9} />
              </mesh>
              
              {/* Pollution Visual (Per cell) */}
              {cell.pollution > 50 && animationsEnabled && (
                 <mesh position={[0, 0.2, 0]}>
                     <sphereGeometry args={[0.3, 4, 4]} />
                     <meshBasicMaterial color="#778822" transparent opacity={0.2} wireframe />
                 </mesh>
              )}

              {/* Building - Render ONLY on Anchor */}
              {isAnchor && cell.building && (
                <group>
                    {/* Calculate center offset */}
                    {(() => {
                        const def = BUILDINGS[cell.building];
                        const offsetX = (def.size[0] - 1) / 2;
                        const offsetZ = (def.size[1] - 1) / 2;
                        return (
                            <group position={[offsetX, 0, offsetZ]}>
                                <BuildingMesh 
                                    type={cell.building} 
                                    position={[0, 0, 0]} 
                                    animationsEnabled={animationsEnabled}
                                    isActive={cell.isActive}
                                    isPowered={cell.isPowered}
                                    efficiency={cell.efficiency}
                                />
                            </group>
                        );
                    })()}
                </group>
              )}

              {/* Preview Ghost (Multi-cell aware) */}
              {renderGhost(x, y)}
              
              {/* Bulldozer Ghost (Single Cell for now, or highlighting handled by getTileColor) */}
              {hoverPos?.x === x && hoverPos?.y === y && hoverBuilding === BuildingType.BULLDOZER && cell.building && (
                  <group>
                      <mesh position={[0, 1, 0]}>
                          <boxGeometry args={[0.5, 0.5, 0.5]} />
                          <meshBasicMaterial color="red" wireframe />
                      </mesh>
                  </group>
              )}
            </group>
          );
        })
      )}
    </group>
  );
};
