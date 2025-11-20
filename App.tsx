
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles, View, PerspectiveCamera } from '@react-three/drei';
import { 
  GameState, 
  BuildingType, 
  GridPosition, 
  StatType, 
  Cell,
  BuildingCategory,
  Difficulty,
  GamePhase
} from './types';
import { 
  INITIAL_MONEY, 
  BUILDINGS, 
  TICK_RATE_MS,
  DAY_LENGTH_TICKS,
  DIFFICULTY_CONFIG
} from './constants';
import { Grid } from './components/Grid';
import { UIOverlay } from './components/UIOverlay';
import { CameraController } from './components/CameraController';
import { BuildingMesh } from './components/BuildingMesh';

const SAVE_KEY = 'ECOPLANET_SAVE_V2'; // Incremented version for incompatible saves

const createInitialGrid = (size: number): Cell[][] => {
  const grid: Cell[][] = [];
  for (let x = 0; x < size; x++) {
    const row: Cell[] = [];
    for (let y = 0; y < size; y++) {
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
    gamePhase: GamePhase.MENU,
    difficulty: Difficulty.NORMAL,
    mapSize: 15, // Default
    resources: {
      money: INITIAL_MONEY,
      lastIncome: 0,
      energy: 0,
      energyDemand: 0,
      maxEnergy: 100,
      water: 500, // Started with 500 water
      maxWater: 500,
      workforce: 0,
      workforceDemand: 0
    },
    stats: {
      [StatType.AIR]: 0,
      [StatType.GREENERY]: 0,
      [StatType.WIND]: 0,
      [StatType.EARTH]: 0,
    },
    grid: [], // Empty initially, created on start
    tickCount: 0,
    timeOfDay: 8, // Start at 8 AM
    isRaining: false,
    rainTimer: 0,
    settings: {
        animations: true,
        timeSpeed: 1
    }
  };
};

const App: React.FC = () => {
  // Lazy initializer for state to handle LocalStorage load
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // If saved game is valid, return it
            if (parsed.grid && parsed.grid.length > 0) {
                 return parsed;
            }
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

  // --- Start Game Logic ---
  const handleStartGame = (difficulty: Difficulty) => {
      const config = DIFFICULTY_CONFIG[difficulty];
      const size = config.size;
      
      const newState = getInitialState();
      newState.gamePhase = GamePhase.PLAYING;
      newState.difficulty = difficulty;
      newState.mapSize = size;
      newState.grid = createInitialGrid(size);
      newState.resources.money = INITIAL_MONEY * config.moneyMultiplier;
      
      setGameState(newState);
      setHasUnsavedChanges(true);
  };

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

  const handleToggleTimeSpeed = useCallback(() => {
      setGameState(prev => {
          let nextSpeed = prev.settings.timeSpeed * 2;
          if (nextSpeed > 4) nextSpeed = 1;
          return { ...prev, settings: { ...prev.settings, timeSpeed: nextSpeed } };
      });
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
      if (gameState.gamePhase === GamePhase.PLAYING && gameState.tickCount > 0) {
          setHasUnsavedChanges(true);
      }
  }, [gameState.tickCount, gameState.resources.money, gameState.gamePhase]); 

  // --- Game Loop ---
  useEffect(() => {
    if (gameState.gamePhase !== GamePhase.PLAYING) return;

    const speed = gameState.settings.timeSpeed || 1;
    const delay = Math.max(50, TICK_RATE_MS / speed); // Min 50ms to prevent freeze

    const interval = setInterval(() => {
      setGameState((prev) => {
        // 1. Time & Weather Logic
        let nextTime = prev.timeOfDay + (24 / DAY_LENGTH_TICKS);
        if (nextTime >= 24) nextTime = 0;
        
        const isDay = nextTime > 6 && nextTime < 18;
        
        // Calculate Cloud Seeder Bonus
        let cloudSeederCount = 0;
        prev.grid.forEach(row => row.forEach(cell => {
            if (cell.building === BuildingType.CLOUD_SEEDER && cell.isActive && cell.isPowered && cell.efficiency > 0 && cell.x === cell.refX && cell.y === cell.refY) {
                cloudSeederCount++;
            }
        }));

        // Weather chance logic
        let isRaining = prev.isRaining;
        let rainTimer = prev.rainTimer;
        
        if (isRaining) {
            // If timer exists, keep raining
            if (rainTimer > 0) {
                rainTimer--;
            } else {
                // Chance to stop after minimum duration
                if (Math.random() < 0.02) isRaining = false;
            }
        } else {
            // Chance to start
            // Base chance 0.5% + 1% per cloud seeder
            const rainProbability = 0.005 + (cloudSeederCount * 0.01);
            if (Math.random() < rainProbability) {
                isRaining = true;
                // Set duration ~30 seconds equivalent in ticks
                // 30 ticks is approx 30 seconds at 1x speed.
                // Since tick rate is dynamic, we use tick count.
                rainTimer = 30 * speed; 
            }
        }

        const newStats = { ...prev.stats };
        let moneyChange = 0;
        let energyProduced = 0;
        let totalEnergyDemand = 0;
        let waterProduced = 0;
        let waterConsumed = 0;
        let waterStorageCapacity = 50; // Base capacity
        let totalWorkforce = 0;
        let totalWorkforceDemand = 0;
        
        const availableWaterStock = prev.resources.water;
        const gridSize = prev.mapSize;

        const nextGrid = prev.grid.map(row => row.map(cell => ({ ...cell, pollutionCap: 100 })));

        // 0.5 Pass: Depollution
        prev.grid.forEach(row => {
            row.forEach(cell => {
                if (cell.building && cell.isActive && cell.x === cell.refX && cell.y === cell.refY) {
                    const def = BUILDINGS[cell.building];
                    if (def.pollutionCapReduction && def.pollutionRadius) {
                        for(let i = -def.pollutionRadius; i <= def.pollutionRadius; i++) {
                            for(let j = -def.pollutionRadius; j <= def.pollutionRadius; j++) {
                                const nx = cell.x + i;
                                const ny = cell.y + j;
                                if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
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
                if (cell.building && cell.isActive && cell.x === cell.refX && cell.y === cell.refY) {
                    const def = BUILDINGS[cell.building];
                    
                    // Calculate Workforce
                    if (def.workersProvided) {
                        const worksAtNight = def.isRobot;
                        const needsWater = def.waterConsumption && def.waterConsumption > 0;
                        const hasWater = availableWaterStock > 0;

                        if ((isDay || worksAtNight) && (!needsWater || hasWater)) {
                            totalWorkforce += def.workersProvided;
                        }
                    }

                    if (def.workersRequired) totalWorkforceDemand += def.workersRequired;
                    
                    if (def.type === BuildingType.RAIN_COLLECTOR && isRaining && def.waterGeneration) {
                        waterProduced += def.waterGeneration;
                    }
                    
                    // New: Atmospheric Condenser generates water passively
                    if (def.type === BuildingType.ATMOSPHERIC_CONDENSER && def.waterGeneration) {
                        if (cell.isPowered) {
                            waterProduced += def.waterGeneration;
                        }
                    }
                    
                    if (def.waterStorage) {
                        waterStorageCapacity += def.waterStorage;
                    }
                }
            });
        });
        
        const workforceRatio = totalWorkforceDemand > 0 ? Math.min(1, totalWorkforce / totalWorkforceDemand) : 1;

        // 2. Second Pass: Energy Production
        let tempEnergyProduced = 0;
        prev.grid.forEach(row => {
            row.forEach(cell => {
                if (cell.building && cell.isActive && cell.x === cell.refX && cell.y === cell.refY) {
                    const def = BUILDINGS[cell.building];
                    
                    // Check Solar
                    if (def.isSolar && !isDay) return; 

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

        // 3. Third Pass: Consumption & Active State Logic
        // Calculate Total Theoretical Demand first
        let potentialEnergyDemand = 0;
        let tempWaterConsumed = 0;
        
        prev.grid.forEach(row => {
            row.forEach(cell => {
                if (cell.building && cell.isActive && cell.x === cell.refX && cell.y === cell.refY) {
                    const def = BUILDINGS[cell.building];
                    if (def.energyConsumption < 0) {
                        potentialEnergyDemand += Math.abs(def.energyConsumption);
                    }
                    if (def.waterConsumption) tempWaterConsumed += def.waterConsumption;
                }
            });
        });

        // Check Stocks
        const availableWater = prev.resources.water + waterProduced;
        const waterRatio = tempWaterConsumed > 0 ? Math.min(1, availableWater / tempWaterConsumed) : 1;
        
        // Determine Power Grid State
        const gridHasPower = tempEnergyProduced >= potentialEnergyDemand;

        // Difficulty Multiplier for Stats
        const diffConfig = DIFFICULTY_CONFIG[prev.difficulty];
        const statMultiplier = diffConfig.statMultiplier;

        // Iterate Grid for Effects
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                const cell = nextGrid[x][y];
                
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
                            if (isAnchor) totalEnergyDemand += Math.abs(def.energyConsumption);

                            if (!gridHasPower && def.energyConsumption < 0) {
                                isPowered = false;
                                efficiency = 0;
                            } else {
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
                            if (val) {
                                const sType = stat as StatType;
                                const currentVal = newStats[sType];
                                
                                // --- DIMINISHING RETURNS LOGIC ---
                                // As currentVal approaches 100 (or higher), gains are reduced.
                                // Formula: Gain * Multiplier * (1 - (current / 120))
                                // At 0 stat: 100% gain.
                                // At 60 stat: 50% gain.
                                // At 100 stat: 16% gain.
                                // This makes it much harder to max out stats.
                                const diminishingFactor = Math.max(0.1, 1 - (currentVal / 150));
                                
                                let change = (val as number) * efficiency * statMultiplier;
                                
                                // Only diminish positive gains
                                if (change > 0) {
                                    change *= diminishingFactor;
                                }

                                newStats[sType] = Math.max(0, currentVal + change);
                            }
                        });
                    }
                }
                cell.pollution = newPollution;
                cell.isPowered = isPowered;
                cell.efficiency = efficiency;
            }
        }

        // 4. Spatial Pollution
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                const cell = nextGrid[x][y];
                 if (cell.building && cell.x === cell.refX && cell.y === cell.refY && cell.isActive && cell.isPowered && cell.efficiency > 0) {
                     const def = BUILDINGS[cell.building];
                     if (def.pollutionAmount && def.pollutionRadius) {
                        for(let i = -def.pollutionRadius; i <= def.pollutionRadius; i++) {
                            for(let j = -def.pollutionRadius; j <= def.pollutionRadius; j++) {
                                const nx = x + i;
                                const ny = y + j;
                                if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                                    nextGrid[nx][ny].pollution += (def.pollutionAmount * cell.efficiency);
                                }
                            }
                        }
                     }
                 }
            }
        }

        // 5. Clamp & Water Logic
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                nextGrid[x][y].pollution = Math.min(nextGrid[x][y].pollutionCap, nextGrid[x][y].pollution);
            }
        }
        
        const netWater = waterProduced - waterConsumed;
        const newWaterStock = Math.max(0, Math.min(waterStorageCapacity, prev.resources.water + netWater));

        return {
          ...prev,
          resources: {
            money: prev.resources.money + moneyChange,
            lastIncome: moneyChange,
            energy: energyProduced - totalEnergyDemand, // Shows negative if deficit
            energyDemand: totalEnergyDemand,
            maxEnergy: energyProduced,
            water: newWaterStock,
            maxWater: waterStorageCapacity,
            workforce: totalWorkforce,
            workforceDemand: totalWorkforceDemand
          },
          stats: newStats,
          grid: nextGrid,
          tickCount: prev.tickCount + 1,
          timeOfDay: nextTime,
          isRaining: isRaining,
          rainTimer: rainTimer
        };
      });
    }, delay);

    return () => clearInterval(interval);
  }, [gameState.settings.timeSpeed, gameState.gamePhase, gameState.difficulty]);

  // --- Interaction ---
  const handleCellClick = useCallback((pos: GridPosition) => {
    if (gameState.gamePhase !== GamePhase.PLAYING) return;

    setGameState(prev => {
        const gridSize = prev.mapSize;
        const cell = prev.grid[pos.x][pos.y];
        
        // --- DESTRUCTION LOGIC ---
        if (selectedBuilding === BuildingType.BULLDOZER) {
            if (cell.building) {
                 const anchorX = cell.refX !== undefined ? cell.refX : pos.x;
                 const anchorY = cell.refY !== undefined ? cell.refY : pos.y;
                 
                 const anchorCell = prev.grid[anchorX][anchorY];
                 if (!anchorCell.building) return prev; 

                 const def = BUILDINGS[anchorCell.building];
                 const refund = Math.floor(def.cost * 0.5);
                 
                 const newGrid = prev.grid.map(row => row.map(c => ({ ...c })));
                 
                 const [width, depth] = def.size;
                 for(let i=0; i<width; i++) {
                     for(let j=0; j<depth; j++) {
                         if (anchorX + i < gridSize && anchorY + j < gridSize) {
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

        if (selectedBuilding === BuildingType.NONE) {
            if (cell.building) {
                const anchorX = cell.refX !== undefined ? cell.refX : pos.x;
                const anchorY = cell.refY !== undefined ? cell.refY : pos.y;
                setSelectedPos({ x: anchorX, y: anchorY });
            }
            else setSelectedPos(null);
            return prev;
        }

        if (cell.building) {
             const anchorX = cell.refX !== undefined ? cell.refX : pos.x;
             const anchorY = cell.refY !== undefined ? cell.refY : pos.y;
             setSelectedPos({ x: anchorX, y: anchorY });
             setSelectedBuilding(BuildingType.NONE);
             return prev;
        }

        const buildingDef = BUILDINGS[selectedBuilding];
        const [width, depth] = buildingDef.size;

        if (pos.x + width > gridSize || pos.y + depth > gridSize) {
            return prev;
        }

        for(let i=0; i<width; i++) {
            for(let j=0; j<depth; j++) {
                if (prev.grid[pos.x + i][pos.y + j].building !== null) {
                    return prev;
                }
            }
        }

        if (prev.resources.money >= buildingDef.cost) {
            const newGrid = prev.grid.map(row => row.map(c => ({ ...c })));
            
            for(let i=0; i<width; i++) {
                for(let j=0; j<depth; j++) {
                    newGrid[pos.x + i][pos.y + j] = {
                        ...newGrid[pos.x + i][pos.y + j],
                        building: selectedBuilding,
                        refX: pos.x,
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
  }, [selectedBuilding, gameState.gamePhase]);

  const toggleBuildingActive = () => {
      if (!selectedPos) return;
      setGameState(prev => {
          const newGrid = prev.grid.map(row => row.map(c => ({ ...c })));
          const gridSize = prev.mapSize;
          const isActive = !newGrid[selectedPos.x][selectedPos.y].isActive;
          
          const cell = newGrid[selectedPos.x][selectedPos.y];
          if(cell.building) {
              const def = BUILDINGS[cell.building];
              const [width, depth] = def.size;
              
              for(let i=0; i<width; i++) {
                for(let j=0; j<depth; j++) {
                     if (selectedPos.x + i < gridSize && selectedPos.y + j < gridSize) {
                         newGrid[selectedPos.x + i][selectedPos.y + j].isActive = isActive;
                     }
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
           const gridSize = prev.mapSize;
           if (!cell.building) return prev;
           const def = BUILDINGS[cell.building];
           const refund = Math.floor(def.cost * 0.5);
           
           const newGrid = prev.grid.map(row => row.map(c => ({ ...c })));
           
           const [width, depth] = def.size;
             for(let i=0; i<width; i++) {
                 for(let j=0; j<depth; j++) {
                     if (selectedPos.x + i < gridSize && selectedPos.y + j < gridSize) {
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

  // Calculate Camera Zoom/Position based on Map Size
  const mapSize = gameState.mapSize || 15;
  const camDistance = mapSize * 2.5;

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

            {gameState.gamePhase === GamePhase.PLAYING && (
                <Grid 
                    grid={gameState.grid} 
                    onCellClick={handleCellClick} 
                    hoverBuilding={selectedBuilding} 
                    animationsEnabled={gameState.settings.animations}
                    isRaining={gameState.isRaining}
                />
            )}

            <OrbitControls 
                maxPolarAngle={Math.PI / 2.2} 
                minDistance={10} 
                maxDistance={camDistance + 40} 
                enablePan={false} 
                makeDefault
            />
        </View>

        {/* Render Menu Previews */}
        {Object.entries(previewRefs).map(([type, ref]) => (
            <View track={{ current: ref }} key={type}>
                <PerspectiveCamera makeDefault position={[2.5, 2, 2.5]} fov={40} />
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
        onToggleTimeSpeed={handleToggleTimeSpeed}
        onStartGame={handleStartGame}
      />

    </div>
  );
};

export default App;
