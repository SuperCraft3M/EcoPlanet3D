
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles, View, PerspectiveCamera } from '@react-three/drei';
import { 
  GameState, 
  BuildingType, 
  GridPosition, 
  StatType, 
  Cell,
  BuildingCategory
} from './types';
import { 
  GRID_SIZE, 
  INITIAL_MONEY, 
  BUILDINGS, 
  TICK_RATE_MS,
  DAY_LENGTH_TICKS
} from './constants';
import { Grid } from './components/Grid';
import { UIOverlay } from './components/UIOverlay';
import { CameraController } from './components/CameraController';
import { BuildingMesh } from './components/BuildingMesh';

const SAVE_KEY = 'ECOPLANET_SAVE_V1';

const createInitialGrid = (): Cell[][] => {
  const grid: Cell[][] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    const row: Cell[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      row.push({ 
        x, y, 
        building: null, 
        pollution: 0,
        pollutionCap: 100,
        waterLevel: 0,
        isActive: true, 
        isPowered: true, 
        efficiency: 1
      });
    }
    grid.push(row);
  }
  return grid;
};

const getInitialState = (): GameState => {
  return {
    resources: {
      money: INITIAL_MONEY,
      lastIncome: 0,
      energy: 0,
      maxEnergy: 100,
      water: 0,
      maxWater: 50,
      workforce: 0,
      workforceDemand: 0
    },
    stats: {
      [StatType.AIR]: 0,
      [StatType.GREENERY]: 0,
      [StatType.WIND]: 0,
      [StatType.EARTH]: 0,
    },
    grid: createInitialGrid(),
    tickCount: 0,
    timeOfDay: 8, // Start at 8 AM
    isRaining: false,
    settings: {
        animations: true
    }
  };
};

const App: React.FC = () => {
  // Lazy initializer for state to handle LocalStorage load
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error("Failed to load save", e);
    }
    return getInitialState();
  });

  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType>(BuildingType.NONE);
  const [selectedPos, setSelectedPos] = useState<GridPosition | null>(null);
  const [previewRefs, setPreviewRefs] = useState<Record<string, HTMLDivElement>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const registerPreview = useCallback((type: BuildingType, el: HTMLDivElement | null) => {
      setPreviewRefs(prev => {
          if (!el) {
              const next = { ...prev };
              delete next[type];
              return next;
          }
          return { ...prev, [type]: el };
      });
  }, []);

  // --- Save / Load / Reset Logic ---

  const handleSaveGame = useCallback(() => {
      try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
          setHasUnsavedChanges(false);
          return true;
      } catch (e) {
          console.error("Save failed", e);
          return false;
      }
  }, [gameState]);

  const handleResetGame = useCallback(() => {
      localStorage.removeItem(SAVE_KEY);
      setGameState(getInitialState());
      setHasUnsavedChanges(false);
      setSelectedBuilding(BuildingType.NONE);
      setSelectedPos(null);
  }, []);

  // Warning on tab close
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (hasUnsavedChanges) {
              e.preventDefault();
              e.returnValue = ''; // Chrome requires returnValue to be set
          }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Mark as unsaved on state change (throttled by effect dependencies)
  useEffect(() => {
      // We don't want to trigger on initial render, but practically the game ticks immediately.
      // Simple approach: If tickCount > 0, we assume changes happen.
      if (gameState.tickCount > 0) {
          setHasUnsavedChanges(true);
      }
  }, [gameState.tickCount, gameState.resources.money]); // Track significant changes

  // --- Game Loop ---
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((prev) => {
        // 1. Time & Weather Logic
        let nextTime = prev.timeOfDay + (24 / DAY_LENGTH_TICKS);
        if (nextTime >= 24) nextTime = 0;
        
        const isDay = nextTime > 6 && nextTime < 18;
        
        // Weather chance
        let isRaining = prev.isRaining;
        if (isRaining) {
            // If raining, 2% chance to stop per tick.
            if (Math.random() < 0.02) isRaining = false;
        } else {
            // If not raining, 0.5% chance to start.
            if (Math.random() < 0.005) isRaining = true;
        }

        const newStats = { ...prev.stats };
        let moneyChange = 0;
        let energyProduced = 0;
        let energyConsumed = 0;
        let waterProduced = 0;
        let waterConsumed = 0;
        let waterStorageCapacity = 50; // Base capacity
        let totalWorkforce = 0;
        let totalDemand = 0;
        
        const availableWaterStock = prev.resources.water;

        const nextGrid = prev.grid.map(row => row.map(cell => ({ ...cell, pollutionCap: 100 })));

        // 0.5 Pass: Depollution
        prev.grid.forEach(row => {
            row.forEach(cell => {
                // Logic only processes for the ANCHOR cell to avoid duplicates
                if (cell.building && cell.isActive && cell.x === cell.refX && cell.y === cell.refY) {
                    const def = BUILDINGS[cell.building];
                    if (def.pollutionCapReduction && def.pollutionRadius) {
                        for(let i = -def.pollutionRadius; i <= def.pollutionRadius; i++) {
                            for(let j = -def.pollutionRadius; j <= def.pollutionRadius; j++) {
                                const nx = cell.x + i;
                                const ny = cell.y + j;
                                if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                                    nextGrid[nx][ny].pollutionCap = Math.max(0, nextGrid[nx][ny].pollutionCap - def.pollutionCapReduction);
                                }
                            }
                        }
                    }
                }
            });
        });

        // 1. First Pass: Workforce, Water Prod, Storage Calc
        waterStorageCapacity += (prev.stats[StatType.EARTH] * 10); 

        prev.grid.forEach(row => {
            row.forEach(cell => {
                // Logic only processes for the ANCHOR cell
                if (cell.building && cell.isActive && cell.x === cell.refX && cell.y === cell.refY) {
                    const def = BUILDINGS[cell.building];
                    
                    // Calculate Workforce
                    if (def.workersProvided) {
                        // Logic: Humans work during day, Robots work always.
                        // Humans need water to live/work.
                        const worksAtNight = def.isRobot;
                        const needsWater = def.waterConsumption && def.waterConsumption > 0;
                        const hasWater = availableWaterStock > 0;

                        // If it's night (and not a robot) OR (needs water and has none) -> No workers
                        if ((isDay || worksAtNight) && (!needsWater || hasWater)) {
                            totalWorkforce += def.workersProvided;
                        }
                    }

                    if (def.workersRequired) totalDemand += def.workersRequired;
                    
                    // Water generation (Rain Collectors)
                    if (def.type === BuildingType.RAIN_COLLECTOR && isRaining && def.waterGeneration) {
                        waterProduced += def.waterGeneration;
                    }
                    
                    // Add Storage
                    if (def.waterStorage) {
                        waterStorageCapacity += def.waterStorage;
                    }
                }
            });
        });
        
        const workforceRatio = totalDemand > 0 ? Math.min(1, totalWorkforce / totalDemand) : 1;

        // 2. Second Pass: Energy Production
        let tempEnergyProduced = 0;
        prev.grid.forEach(row => {
            row.forEach(cell => {
                // Logic only processes for the ANCHOR cell
                if (cell.building && cell.isActive && cell.x === cell.refX && cell.y === cell.refY) {
                    const def = BUILDINGS[cell.building];
                    
                    // Check Solar
                    if (def.isSolar && !isDay) return; // No production at night

                    let statEfficiency = 1;
                    if (def.minStats) {
                        const hasMin = Object.entries(def.minStats).every(([k, v]) => prev.stats[k as StatType] >= v);
                        if (!hasMin) statEfficiency = 0;
                    }
                    if (def.statScaling && statEfficiency > 0) {
                        Object.entries(def.statScaling).forEach(([k, v]) => {
                            statEfficiency += (prev.stats[k as StatType] * (v as number));
                        });
                    }

                    if (def.energyConsumption > 0) {
                        tempEnergyProduced += (def.energyConsumption * statEfficiency);
                    }
                }
            });
        });

        // 3. Third Pass: Consumption (Energy & Water) & Active State Logic
        let tempWaterConsumed = 0;
        prev.grid.forEach(row => {
            row.forEach(cell => {
                // Logic only processes for the ANCHOR cell
                if (cell.building && cell.isActive && cell.x === cell.refX && cell.y === cell.refY) {
                    const def = BUILDINGS[cell.building];
                    if (def.waterConsumption) tempWaterConsumed += def.waterConsumption;
                }
            });
        });

        // Check Stocks
        const availableWater = prev.resources.water + waterProduced;
        const waterRatio = tempWaterConsumed > 0 ? Math.min(1, availableWater / tempWaterConsumed) : 1;

        let tempEnergyConsumption = 0;
        prev.grid.forEach(row => {
            row.forEach(cell => {
                 // Logic only processes for the ANCHOR cell
                 if (cell.building && cell.isActive && cell.x === cell.refX && cell.y === cell.refY) {
                    if (BUILDINGS[cell.building].energyConsumption < 0) {
                        tempEnergyConsumption += Math.abs(BUILDINGS[cell.building].energyConsumption);
                    }
                }
            });
        });
        
        const gridHasPower = tempEnergyProduced >= tempEnergyConsumption;

        // Iterate Grid for Effects
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const cell = nextGrid[x][y];
                
                // Only process ANCHOR logic for output, but we need to update status for ALL cells
                const isAnchor = cell.building && cell.x === cell.refX && cell.y === cell.refY;
                
                let newPollution = Math.max(0, cell.pollution - 1);
                
                let isPowered = true;
                let efficiency = 1;

                if (cell.building) {
                    const def = BUILDINGS[cell.building];
                    
                    if (!cell.isActive) {
                        isPowered = false;
                        efficiency = 0;
                    } else {
                        // Producer
                        if (def.energyConsumption > 0) {
                            if (def.isSolar && !isDay) {
                                efficiency = 0; // Night time
                            } else {
                                let statMult = 1;
                                if (def.statScaling) {
                                    Object.entries(def.statScaling).forEach(([k, v]) => {
                                        statMult += (prev.stats[k as StatType] * (v as number));
                                    });
                                }
                                if (def.minStats) {
                                    const hasMin = Object.entries(def.minStats).every(([k, v]) => prev.stats[k as StatType] >= v);
                                    if (!hasMin) statMult = 0;
                                }
                                efficiency = statMult;
                                if (isAnchor) energyProduced += (def.energyConsumption * efficiency);
                            }
                        } else {
                            // Consumer
                            if (!gridHasPower && def.energyConsumption < 0) {
                                isPowered = false;
                                efficiency = 0;
                            } else {
                                if (isAnchor) energyConsumed += Math.abs(def.energyConsumption);
                                
                                // Calculate Efficiency based on needs
                                if (def.workersRequired) {
                                    efficiency *= workforceRatio;
                                }
                                if (def.waterConsumption) {
                                    if (isAnchor) waterConsumed += def.waterConsumption;
                                    efficiency *= waterRatio;
                                }

                                // Logic for Housing Visuals
                                if (def.workersProvided > 0) {
                                     const worksAtNight = def.isRobot;
                                     const needsWater = def.waterConsumption && def.waterConsumption > 0;
                                     const hasWater = availableWaterStock > 0;
             
                                     if ((!isDay && !worksAtNight) || (needsWater && !hasWater)) {
                                         efficiency = 0;
                                     }
                                }
                            }
                        }
                    }

                    if (cell.isActive && isPowered && efficiency > 0 && isAnchor) {
                        if (def.resourceGeneration) {
                            moneyChange += (def.resourceGeneration * efficiency);
                        }
                        Object.entries(def.effects).forEach(([stat, val]) => {
                            if (val) newStats[stat as StatType] = Math.min(100, Math.max(0, newStats[stat as StatType] + ((val as number) * efficiency)));
                        });
                    }
                }
                cell.pollution = newPollution;
                cell.isPowered = isPowered;
                cell.efficiency = efficiency;
            }
        }

        // 4. Spatial Pollution
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const cell = nextGrid[x][y];
                 // Only anchor radiates pollution
                 if (cell.building && cell.x === cell.refX && cell.y === cell.refY && cell.isActive && cell.isPowered && cell.efficiency > 0) {
                     const def = BUILDINGS[cell.building];
                     if (def.pollutionAmount && def.pollutionRadius) {
                        for(let i = -def.pollutionRadius; i <= def.pollutionRadius; i++) {
                            for(let j = -def.pollutionRadius; j <= def.pollutionRadius; j++) {
                                const nx = x + i;
                                const ny = y + j;
                                if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                                    nextGrid[nx][ny].pollution += (def.pollutionAmount * cell.efficiency);
                                }
                            }
                        }
                     }
                 }
            }
        }

        // 5. Clamp & Water Logic
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                nextGrid[x][y].pollution = Math.min(nextGrid[x][y].pollutionCap, nextGrid[x][y].pollution);
            }
        }
        
        const netWater = waterProduced - waterConsumed;
        // Apply maxWater capacity
        const newWaterStock = Math.max(0, Math.min(waterStorageCapacity, prev.resources.water + netWater));

        return {
          ...prev,
          resources: {
            money: prev.resources.money + moneyChange,
            lastIncome: moneyChange,
            energy: energyProduced - energyConsumed,
            maxEnergy: energyProduced,
            water: newWaterStock,
            maxWater: waterStorageCapacity,
            workforce: totalWorkforce,
            workforceDemand: totalDemand
          },
          stats: newStats,
          grid: nextGrid,
          tickCount: prev.tickCount + 1,
          timeOfDay: nextTime,
          isRaining: isRaining
        };
      });
    }, TICK_RATE_MS);

    return () => clearInterval(interval);
  }, []);

  // --- Interaction ---
  const handleCellClick = useCallback((pos: GridPosition) => {
    setGameState(prev => {
        const cell = prev.grid[pos.x][pos.y];
        
        // --- DESTRUCTION LOGIC ---
        if (selectedBuilding === BuildingType.BULLDOZER) {
            if (cell.building) {
                 // If clicking a secondary cell, find anchor
                 const anchorX = cell.refX !== undefined ? cell.refX : pos.x;
                 const anchorY = cell.refY !== undefined ? cell.refY : pos.y;
                 
                 const anchorCell = prev.grid[anchorX][anchorY];
                 if (!anchorCell.building) return prev; // Should not happen

                 const def = BUILDINGS[anchorCell.building];
                 const refund = Math.floor(def.cost * 0.5);
                 
                 const newGrid = prev.grid.map(row => row.map(c => ({ ...c })));
                 
                 // Clear entire footprint
                 const [width, depth] = def.size;
                 for(let i=0; i<width; i++) {
                     for(let j=0; j<depth; j++) {
                         if (anchorX + i < GRID_SIZE && anchorY + j < GRID_SIZE) {
                             newGrid[anchorX + i][anchorY + j] = {
                                 ...newGrid[anchorX + i][anchorY + j],
                                 building: null,
                                 refX: undefined,
                                 refY: undefined,
                                 isActive: true,
                                 isPowered: true,
                                 efficiency: 1,
                                 pollution: 0
                             };
                         }
                     }
                 }

                 return {
                     ...prev,
                     resources: { ...prev.resources, money: prev.resources.money + refund },
                     grid: newGrid
                 };
            }
            return prev;
        }

        // --- SELECTION LOGIC ---
        if (selectedBuilding === BuildingType.NONE) {
            if (cell.building) {
                // Select the anchor
                const anchorX = cell.refX !== undefined ? cell.refX : pos.x;
                const anchorY = cell.refY !== undefined ? cell.refY : pos.y;
                setSelectedPos({ x: anchorX, y: anchorY });
            }
            else setSelectedPos(null);
            return prev;
        }

        // If clicking a building with a building selected -> Select it instead of placing
        if (cell.building) {
             const anchorX = cell.refX !== undefined ? cell.refX : pos.x;
             const anchorY = cell.refY !== undefined ? cell.refY : pos.y;
             setSelectedPos({ x: anchorX, y: anchorY });
             setSelectedBuilding(BuildingType.NONE);
             return prev;
        }

        // --- PLACEMENT LOGIC ---
        const buildingDef = BUILDINGS[selectedBuilding];
        const [width, depth] = buildingDef.size;

        // Check Bounds
        if (pos.x + width > GRID_SIZE || pos.y + depth > GRID_SIZE) {
            // Out of bounds
            return prev;
        }

        // Check Collisions
        for(let i=0; i<width; i++) {
            for(let j=0; j<depth; j++) {
                if (prev.grid[pos.x + i][pos.y + j].building !== null) {
                    // Occupied
                    return prev;
                }
            }
        }

        if (prev.resources.money >= buildingDef.cost) {
            const newGrid = prev.grid.map(row => row.map(c => ({ ...c })));
            
            // Fill footprint
            for(let i=0; i<width; i++) {
                for(let j=0; j<depth; j++) {
                    newGrid[pos.x + i][pos.y + j] = {
                        ...newGrid[pos.x + i][pos.y + j],
                        building: selectedBuilding,
                        refX: pos.x, // Anchor is the top-left clicked position
                        refY: pos.y,
                        isActive: true,
                        isPowered: true,
                        efficiency: 1,
                        pollutionCap: 100
                    };
                }
            }

            return {
                ...prev,
                resources: { ...prev.resources, money: prev.resources.money - buildingDef.cost },
                grid: newGrid
            };
        }
        return prev;
    });
  }, [selectedBuilding]);

  const toggleBuildingActive = () => {
      if (!selectedPos) return;
      setGameState(prev => {
          // Toggle anchor
          const newGrid = prev.grid.map(row => row.map(c => ({ ...c })));
          const isActive = !newGrid[selectedPos.x][selectedPos.y].isActive;
          
          const cell = newGrid[selectedPos.x][selectedPos.y];
          if(cell.building) {
              const def = BUILDINGS[cell.building];
              const [width, depth] = def.size;
              
              for(let i=0; i<width; i++) {
                for(let j=0; j<depth; j++) {
                     newGrid[selectedPos.x + i][selectedPos.y + j].isActive = isActive;
                }
              }
          }
          
          return { ...prev, grid: newGrid };
      });
  };

  const destroyBuilding = () => {
      if (!selectedPos) return;
       setGameState(prev => {
           const cell = prev.grid[selectedPos.x][selectedPos.y];
           if (!cell.building) return prev;
           const def = BUILDINGS[cell.building];
           const refund = Math.floor(def.cost * 0.5);
           
           const newGrid = prev.grid.map(row => row.map(c => ({ ...c })));
           
           const [width, depth] = def.size;
             for(let i=0; i<width; i++) {
                 for(let j=0; j<depth; j++) {
                     if (selectedPos.x + i < GRID_SIZE && selectedPos.y + j < GRID_SIZE) {
                         newGrid[selectedPos.x + i][selectedPos.y + j] = {
                             ...newGrid[selectedPos.x + i][selectedPos.y + j],
                             building: null,
                             refX: undefined,
                             refY: undefined
                         };
                     }
                 }
             }

           return { ...prev, resources: { ...prev.resources, money: prev.resources.money + refund }, grid: newGrid };
       });
       setSelectedPos(null);
  };

  const toggleAnimations = () => {
      setGameState(prev => ({ ...prev, settings: { ...prev.settings, animations: !prev.settings.animations } }));
  };

  // Environment Parameters Helpers
  const isDay = gameState.timeOfDay > 6 && gameState.timeOfDay < 18;
  
  const bgDay = '#87CEEB'; 
  const bgNight = '#2b3544'; 
  
  const lightDay = '#ffffff';
  const lightNight = '#b0c4de';

  const ambientInt = isDay ? 0.7 : 0.6; 
  const dirInt = isDay ? 1.2 : 0.8; 

  const timeRatio = gameState.timeOfDay / 24;
  const sunX = Math.sin(timeRatio * Math.PI * 2) * 50;
  const sunY = Math.cos(timeRatio * Math.PI * 2) * 50;

  return (
    <div ref={mainContainerRef} className="w-full h-screen bg-black overflow-hidden relative select-none" tabIndex={0}>
      
      <Canvas 
        shadows 
        eventSource={mainContainerRef}
        className="absolute inset-0 z-0"
        style={{ pointerEvents: 'none' }}
      >
        <View track={mainContainerRef}>
            <color attach="background" args={[isDay ? bgDay : bgNight]} />
            
            <CameraController />
            
            {!isDay && <Stars 
                radius={300} 
                depth={100} 
                count={5000} 
                factor={6} 
                saturation={0} 
                fade 
                speed={gameState.settings.animations ? 0.5 : 0} 
            />}
            
            {gameState.isRaining && (
                <Sparkles count={5000} scale={40} size={5} speed={2} opacity={0.6} color="#88ccff" position={[0,10,0]} />
            )}

            <ambientLight intensity={ambientInt} />
            
            <directionalLight 
                position={[sunX, Math.abs(sunY), 10]} 
                intensity={gameState.isRaining ? 0.5 : dirInt} 
                castShadow 
                shadow-mapSize={[2048, 2048]} 
                color={isDay ? lightDay : lightNight}
            />

            <Grid 
                grid={gameState.grid} 
                onCellClick={handleCellClick} 
                hoverBuilding={selectedBuilding} 
                animationsEnabled={gameState.settings.animations}
                isRaining={gameState.isRaining}
            />

            <OrbitControls 
                maxPolarAngle={Math.PI / 2.2} 
                minDistance={10} 
                maxDistance={80} 
                enablePan={false} 
                makeDefault
            />
        </View>

        {/* Menu Item Previews */}
        {Object.entries(previewRefs).map(([type, ref]) => (
            <View track={{ current: ref }} key={type}>
                <PerspectiveCamera makeDefault position={[2.5, 2, 2.5]} fov={40} />
                
                {/* Studio Lighting for Previews */}
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />
                <pointLight position={[-5, 2, -5]} intensity={0.8} color="#93c5fd" />
                <spotLight position={[0, 5, 0]} angle={0.5} penumbra={1} intensity={1} castShadow />

                <BuildingMesh 
                    type={type as BuildingType} 
                    position={[0, 0, 0]} 
                    animationsEnabled={true} 
                    isMenuPreview={true} 
                />
                
                <OrbitControls 
                    autoRotate 
                    autoRotateSpeed={6} 
                    enableZoom={false} 
                    enablePan={false} 
                    enableRotate={false} 
                    minPolarAngle={Math.PI/3.5} 
                    maxPolarAngle={Math.PI/3.5} 
                />
            </View>
        ))}
      </Canvas>

      <UIOverlay 
        gameState={gameState} 
        selectedBuilding={selectedBuilding} 
        onSelectBuilding={setSelectedBuilding} 
        onToggleAnimations={toggleAnimations}
        selectedPos={selectedPos}
        onCloseInspector={() => setSelectedPos(null)}
        onToggleActive={toggleBuildingActive}
        onDestroy={destroyBuilding}
        onRegisterPreview={registerPreview}
        onSaveGame={handleSaveGame}
        onResetGame={handleResetGame}
        hasUnsavedChanges={hasUnsavedChanges}
      />

    </div>
  );
};

export default App;
