import React, { useState, useEffect, useRef } from 'react';
import { GameState, BuildingType, StatType, BuildingCategory, GridPosition, BuildingDef, Difficulty, GamePhase } from '../types';
import { BUILDINGS, STAT_MULT, DIFFICULTY_CONFIG } from '../constants';
import { Wind, Droplets, Leaf, Mountain, Zap, DollarSign, Play, Pause, Users, Briefcase, X, Power, ChevronDown, ChevronUp, MousePointer2, Trash2, Lock, CloudRain, Sun, Moon, Save, RotateCcw, AlertTriangle, Check, Cloud, FastForward, Globe } from 'lucide-react';

interface UIOverlayProps {
  gameState: GameState;
  selectedBuilding: BuildingType;
  onSelectBuilding: (type: BuildingType) => void;
  onToggleAnimations: () => void;
  selectedPos: GridPosition | null;
  onCloseInspector: () => void;
  onToggleActive: () => void;
  onDestroy: () => void;
  onRegisterPreview: (type: BuildingType, el: HTMLDivElement | null) => void;
  onSaveGame: () => boolean;
  onResetGame: () => void;
  hasUnsavedChanges: boolean;
  onToggleTimeSpeed: () => void;
  onStartGame: (diff: Difficulty) => void;
}

const statNames: Record<StatType, string> = {
    [StatType.AIR]: 'Atmosphère',
    [StatType.GREENERY]: 'Verdure',
    [StatType.WIND]: 'Vent',
    [StatType.EARTH]: 'Terre',
};

const BuildingPreview = ({ type, onRegister }: { type: BuildingType, onRegister: (t: BuildingType, el: HTMLDivElement | null) => void }) => {
    const ref = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (ref.current) {
            onRegister(type, ref.current);
        }
        return () => {
           if (ref.current) onRegister(type, null);
        };
    }, [type, onRegister]);

    return (
        <div ref={ref} className="w-full h-16 relative rounded overflow-hidden bg-white/5">
        </div>
    );
};

export const UIOverlay: React.FC<UIOverlayProps> = ({ 
  gameState, 
  selectedBuilding, 
  onSelectBuilding,
  onToggleAnimations,
  selectedPos,
  onCloseInspector,
  onToggleActive,
  onDestroy,
  onRegisterPreview,
  onSaveGame,
  onResetGame,
  hasUnsavedChanges,
  onToggleTimeSpeed,
  onStartGame
}) => {
  
  const [selectedCategory, setSelectedCategory] = useState<BuildingCategory>(BuildingCategory.ENERGY);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [hoveredBuildingType, setHoveredBuildingType] = useState<BuildingType | null>(null);
  const [hoveredResource, setHoveredResource] = useState<string | null>(null);
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  if (gameState.gamePhase === GamePhase.MENU) {
      return (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md pointer-events-auto">
              <div className="max-w-2xl w-full p-8 bg-slate-900 border border-indigo-500 rounded-2xl shadow-2xl flex flex-col items-center">
                  <Globe className="w-20 h-20 text-indigo-400 mb-4 animate-pulse" />
                  <h1 className="text-4xl font-bold text-white mb-2 pixel-font">EcoPlanet</h1>
                  <p className="text-slate-400 mb-8 text-center">Simulateur de Terraformation</p>
                  
                  <h2 className="text-xl text-white mb-4 font-bold">Choisir la Difficulté</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">
                      {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => onStartGame(key as Difficulty)}
                            className="bg-slate-800 hover:bg-indigo-900 border border-slate-700 hover:border-indigo-400 p-4 rounded-xl transition-all flex flex-col gap-2 text-left group"
                          >
                              <span className="text-lg font-bold text-white group-hover:text-indigo-300">{config.label}</span>
                              <p className="text-xs text-slate-400 leading-relaxed">{config.description}</p>
                              <div className="mt-auto pt-2 border-t border-white/10 flex justify-between text-xs font-mono">
                                  <span className="text-slate-500">Gain Stats</span>
                                  <span className={config.statMultiplier < 1 ? 'text-red-400' : 'text-green-400'}>{config.statMultiplier}x</span>
                              </div>
                          </button>
                      ))}
                  </div>
                  
                  <p className="text-xs text-slate-500 text-center max-w-md">
                      La difficulté affecte la vitesse de progression et la taille de la carte.
                      Plus le niveau est élevé, plus les pourcentages sont difficiles à augmenter.
                  </p>
              </div>
          </div>
      );
  }

  const handleToggleMenu = () => {
      const newState = !isMenuOpen;
      setIsMenuOpen(newState);
      if (!newState) {
          onSelectBuilding(BuildingType.NONE);
      }
  };

  const handleSaveClick = () => {
      const success = onSaveGame();
      if (success) {
          setSaveFeedback("Partie Sauvegardée !");
          setTimeout(() => setSaveFeedback(null), 2000);
      }
  };

  const getLockStatus = (b: BuildingDef) => {
      const reasons: string[] = [];
      if (b.type === BuildingType.BULLDOZER) return [];
      if (gameState.resources.money < b.cost) {
          reasons.push(`Manque $${Math.ceil(b.cost - gameState.resources.money)}`);
      }
      if (b.minStats) {
          Object.entries(b.minStats).forEach(([stat, minVal]) => {
              const currentVal = gameState.stats[stat as StatType];
              if (currentVal < minVal) {
                  reasons.push(`Requis: ${statNames[stat as StatType]} > ${minVal}%`);
              }
          });
      }
      return reasons;
  };

  const getResourceBreakdown = (type: 'MONEY' | 'ENERGY' | 'WATER' | 'WORKFORCE') => {
      const breakdown: Record<string, number> = {};
      gameState.grid.forEach(row => {
          row.forEach(cell => {
              if (cell.building && cell.x === cell.refX && cell.y === cell.refY && cell.isActive && cell.efficiency > 0) {
                  const def = BUILDINGS[cell.building];
                  let val = 0;
                  if (type === 'MONEY' && def.resourceGeneration) val = def.resourceGeneration * cell.efficiency;
                  if (type === 'ENERGY' && def.energyConsumption) val = def.energyConsumption * (def.energyConsumption > 0 ? cell.efficiency : 1);
                  if (type === 'WATER' && (def.waterGeneration || def.waterConsumption)) val = (def.waterGeneration || 0) - (def.waterConsumption || 0);
                  
                  if (val !== 0) {
                      breakdown[def.name] = (breakdown[def.name] || 0) + val;
                  }
              }
          });
      });
      return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  };

  const ResourceTooltip = ({ type, title }: { type: any, title: string }) => (
      <div className="absolute top-full mt-2 left-0 bg-slate-900 border border-slate-600 p-3 rounded-lg shadow-xl z-50 w-48">
          <h4 className="font-bold text-white mb-2 border-b border-slate-700 pb-1">{title}</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              {getResourceBreakdown(type).length === 0 ? (
                  <span className="text-xs text-slate-500">Aucune activité</span>
              ) : (
                  getResourceBreakdown(type).map(([name, val]) => (
                      <div key={name} className="flex justify-between text-xs">
                          <span className="text-slate-300 truncate pr-2">{name}</span>
                          <span className={val > 0 ? 'text-green-400' : 'text-red-400'}>
                              {val > 0 ? '+' : ''}{val.toFixed(1)}
                          </span>
                      </div>
                  ))
              )}
          </div>
      </div>
  );

  const StatBar = ({ icon: Icon, value, label, colorClass }: any) => (
    <div className="flex flex-col items-center bg-black/60 p-2 rounded-lg backdrop-blur-sm w-20 shadow-md border border-white/10">
      <Icon className={`w-6 h-6 mb-1 ${colorClass}`} />
      <div className="w-full bg-gray-700 h-2 rounded-full mt-1 relative overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${colorClass.replace('text', 'bg')}`} 
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs mt-1 font-mono">{value.toFixed(1)}%</span>
      <span className="text-[10px] opacity-70">{label}</span>
    </div>
  );

  const hours = Math.floor(gameState.timeOfDay);
  const minutes = Math.floor((gameState.timeOfDay - hours) * 60);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const isDay = gameState.timeOfDay > 6 && gameState.timeOfDay < 18;

  const selectedCell = selectedPos ? gameState.grid[selectedPos.x][selectedPos.y] : null;
  const inspectedBuilding = selectedCell?.building ? BUILDINGS[selectedCell.building] : null;
  const hoveredDef = hoveredBuildingType ? BUILDINGS[hoveredBuildingType] : null;
  const hoveredLockedReasons = hoveredDef ? getLockStatus(hoveredDef) : [];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-2">
            {/* Resources */}
            <div className="flex gap-4 bg-slate-900/90 p-3 rounded-xl border border-slate-600 backdrop-blur-md text-white shadow-lg items-center">
                {/* Time & Weather */}
                <div className="flex flex-col items-center min-w-[60px]">
                    {gameState.isRaining ? <CloudRain className="text-blue-400" /> : isDay ? <Sun className="text-yellow-400" /> : <Moon className="text-slate-400" />}
                    <span className="text-xs font-mono">{timeString}</span>
                    <span className="text-[10px] text-slate-500">Jour {Math.floor(gameState.tickCount / 300)}</span>
                </div>

                <div className="w-px bg-slate-600 h-8 mx-1"></div>

                <div 
                    className="flex items-center gap-2 min-w-[120px] relative cursor-help"
                    onMouseEnter={() => setHoveredResource('MONEY')}
                    onMouseLeave={() => setHoveredResource(null)}
                >
                    <div className="bg-yellow-500 p-1.5 rounded-full">
                        <DollarSign className="w-4 h-4 text-black" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="font-mono text-lg">{Math.floor(gameState.resources.money)}</span>
                        <span className={`text-[10px] ${gameState.resources.lastIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {gameState.resources.lastIncome >= 0 ? '+' : ''}{gameState.resources.lastIncome.toFixed(1)}/s
                        </span>
                    </div>
                    {hoveredResource === 'MONEY' && <ResourceTooltip type="MONEY" title="Revenus / Dépenses" />}
                </div>
                
                <div className="w-px bg-slate-600 mx-1"></div>
                
                <div 
                    className="flex items-center gap-2 min-w-[120px] relative cursor-help"
                    onMouseEnter={() => setHoveredResource('ENERGY')}
                    onMouseLeave={() => setHoveredResource(null)}
                >
                    <div className={`${gameState.resources.energy < 0 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'} p-1.5 rounded-full`}>
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col leading-none">
                         <span className={`font-mono text-lg ${gameState.resources.energy < 0 ? 'text-red-400' : ''}`}>
                            {Math.floor(gameState.resources.energy)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                            Prod: {Math.floor(gameState.resources.maxEnergy)} | Req: {Math.floor(gameState.resources.energyDemand)}
                        </span>
                    </div>
                    {hoveredResource === 'ENERGY' && <ResourceTooltip type="ENERGY" title="Bilan Énergétique" />}
                </div>

                <div className="w-px bg-slate-600 mx-1"></div>

                <div 
                    className="flex items-center gap-2 min-w-[100px] relative cursor-help"
                    onMouseEnter={() => setHoveredResource('WATER')}
                    onMouseLeave={() => setHoveredResource(null)}
                >
                     <div className="bg-cyan-600 p-1.5 rounded-full">
                        <Droplets className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col leading-none">
                         <span className="font-mono text-lg">{Math.floor(gameState.resources.water)}</span>
                         <span className="text-[10px] text-slate-400">Max: {gameState.resources.maxWater}</span>
                    </div>
                    {hoveredResource === 'WATER' && <ResourceTooltip type="WATER" title="Bilan Eau" />}
                </div>

                <div className="w-px bg-slate-600 mx-1"></div>

                <div className="flex items-center gap-2 min-w-[100px]">
                     <div className="bg-orange-500 p-1.5 rounded-full">
                        <Users className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col leading-none">
                         <span className={`font-mono text-lg ${gameState.resources.workforce < gameState.resources.workforceDemand ? 'text-orange-400' : 'text-white'}`}>
                            {gameState.resources.workforce} / {gameState.resources.workforceDemand}
                        </span>
                        <span className="text-[10px] text-slate-400">Ouvriers</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex gap-4 items-start">
            
            <div className="flex flex-col gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
                <button 
                    onClick={handleSaveClick}
                    className={`p-3 rounded-lg border shadow transition-all relative ${hasUnsavedChanges ? 'bg-indigo-700 border-indigo-500 text-white' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                    title="Sauvegarder la partie"
                >
                    <Save className="w-5 h-5" />
                    {hasUnsavedChanges && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>

                <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="bg-slate-800 hover:bg-red-900/90 text-slate-300 hover:text-red-100 border-slate-600 hover:border-red-500 p-3 rounded-lg border shadow transition-all"
                    title="Supprimer la sauvegarde et recommencer"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => onSelectBuilding(BuildingType.NONE)}
                    className={`p-3 rounded-lg border shadow transition-all ${selectedBuilding === BuildingType.NONE ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                    title="Mode Inspection"
                >
                    <MousePointer2 className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => onSelectBuilding(BuildingType.BULLDOZER)}
                    className={`p-3 rounded-lg border shadow transition-all ${selectedBuilding === BuildingType.BULLDOZER ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                    title="Bulldozer (Détruire)"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
                
                <div className="w-px bg-white/20 mx-1"></div>

                <button 
                    onClick={onToggleAnimations}
                    className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg border border-slate-600 shadow transition-all"
                    title={gameState.settings.animations ? "Pause Animations" : "Play Animations"}
                >
                    {gameState.settings.animations ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                <button 
                    onClick={onToggleTimeSpeed}
                    className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg border border-slate-600 shadow transition-all min-w-[50px] font-mono font-bold"
                    title="Vitesse de jeu"
                >
                    {gameState.settings.timeSpeed}x
                </button>
            </div>
        </div>
      </div>

      {saveFeedback && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 animate-bounce z-50">
              <Check className="w-4 h-4" /> {saveFeedback}
          </div>
      )}

      {showResetConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
              <div className="bg-slate-900 border border-red-500 p-6 rounded-xl max-w-sm text-center shadow-2xl">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Supprimer la sauvegarde ?</h3>
                  <p className="text-slate-300 mb-6">
                      Cette action est irréversible. Votre progression actuelle sera perdue et le jeu recommencera à zéro.
                  </p>
                  <div className="flex gap-4 justify-center">
                      <button 
                        onClick={() => setShowResetConfirm(false)}
                        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
                      >
                          Annuler
                      </button>
                      <button 
                        onClick={() => {
                            onResetGame();
                            setShowResetConfirm(false);
                        }}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2"
                      >
                          <Trash2 size={16} />
                          Tout Supprimer
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="absolute top-24 right-4 flex flex-col gap-3 pointer-events-auto">
        <StatBar icon={Cloud} value={gameState.stats[StatType.AIR]} label="Atmosphère" colorClass="text-cyan-400" />
        <StatBar icon={Leaf} value={gameState.stats[StatType.GREENERY]} label="Verdure" colorClass="text-green-400" />
        <StatBar icon={Wind} value={gameState.stats[StatType.WIND]} label="Vent" colorClass="text-gray-300" />
        <StatBar icon={Mountain} value={gameState.stats[StatType.EARTH]} label="Terre" colorClass="text-amber-600" />
      </div>

      {inspectedBuilding && selectedCell && (
        <div className="absolute bottom-4 right-4 md:right-auto md:left-1/2 md:-translate-x-1/2 md:bottom-32 z-40 pointer-events-auto">
             <div className="bg-slate-900/95 border border-slate-500 p-5 rounded-xl shadow-2xl w-80 backdrop-blur-xl text-white">
                 <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="font-bold text-lg text-indigo-300">{inspectedBuilding.name}</h3>
                        <p className="text-xs text-slate-400">{inspectedBuilding.category}</p>
                     </div>
                     <button onClick={onCloseInspector} className="text-slate-400 hover:text-white"><X size={20}/></button>
                 </div>

                 <div className="space-y-3 mb-4">
                     <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                         <span>État</span>
                         <div className="flex items-center gap-2">
                             <span className={`w-2 h-2 rounded-full ${selectedCell.isActive ? (selectedCell.isPowered ? 'bg-green-500' : 'bg-red-500 animate-pulse') : 'bg-gray-500'}`}></span>
                             <span className={selectedCell.isActive ? (selectedCell.isPowered ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}>
                                 {selectedCell.isActive ? (selectedCell.isPowered ? 'Actif' : 'Inactif') : 'En Pause'}
                             </span>
                         </div>
                     </div>
                     
                     <div className="flex justify-between items-center text-sm">
                         <span>Efficacité</span>
                         <span className={`font-mono ${selectedCell.efficiency < 1 ? 'text-orange-400' : 'text-green-400'}`}>{(selectedCell.efficiency * 100).toFixed(0)}%</span>
                     </div>

                     <div className="flex justify-between items-center text-sm">
                         <span>Énergie</span>
                         <span className={`font-mono ${inspectedBuilding.energyConsumption > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {inspectedBuilding.energyConsumption > 0 ? '+' : ''}
                            {(inspectedBuilding.energyConsumption * (inspectedBuilding.energyConsumption > 0 ? selectedCell.efficiency : 1)).toFixed(1)}
                         </span>
                     </div>

                     {inspectedBuilding.workersProvided ? (
                        <div className="flex justify-between items-center text-sm">
                             <span>Habitants</span>
                             <span className={`font-mono ${selectedCell.efficiency < 1 && selectedCell.isActive ? 'text-red-400' : 'text-green-400'}`}>
                                 +{inspectedBuilding.workersProvided} {selectedCell.efficiency < 1 ? '(Dort/Inactif)' : ''}
                             </span>
                        </div>
                     ) : null}

                     {inspectedBuilding.workersRequired ? (
                        <div className="flex justify-between items-center text-sm">
                             <span>Ouvriers Requis</span>
                             <span className={`font-mono ${selectedCell.efficiency < 1 && selectedCell.isActive ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                                 {Math.floor(inspectedBuilding.workersRequired * selectedCell.efficiency)} / {inspectedBuilding.workersRequired}
                             </span>
                        </div>
                     ) : null}

                     {inspectedBuilding.waterStorage ? (
                         <div className="flex justify-between items-center text-sm">
                            <span>Capacité Stockage</span>
                            <span className="font-mono text-blue-400">+{inspectedBuilding.waterStorage} L</span>
                         </div>
                     ) : null}
                     {inspectedBuilding.waterGeneration ? (
                         <div className="flex justify-between items-center text-sm">
                            <span>Production Pluie</span>
                            <span className="font-mono text-blue-400">{inspectedBuilding.waterGeneration} L/tick</span>
                         </div>
                     ) : null}

                     <div className="flex justify-between items-center text-sm">
                         <span>Pollution</span>
                         <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden relative">
                             <div className="h-full bg-purple-500" style={{width: `${selectedCell.pollution}%`}}></div>
                             <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{left: `${selectedCell.pollutionCap}%`}}></div>
                         </div>
                     </div>
                 </div>

                 <div className="flex gap-2">
                     <button 
                        onClick={onToggleActive}
                        className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                            selectedCell.isActive 
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' 
                            : 'bg-green-900/50 text-green-200 hover:bg-green-900 border border-green-700'
                        }`}
                     >
                         <Power size={16} />
                         {selectedCell.isActive ? 'Pause' : 'Activer'}
                     </button>
                     <button 
                        onClick={onDestroy}
                        className="flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors bg-red-900/50 text-red-200 hover:bg-red-900 border border-red-700"
                     >
                         <Trash2 size={16} />
                         Démolir
                     </button>
                 </div>
             </div>
        </div>
      )}

      <div className={`pointer-events-auto w-full flex flex-col gap-2 transition-all duration-300 relative ${isMenuOpen ? 'translate-y-0' : 'translate-y-[85%]'}`}>
        
        {hoveredDef && (
             <div className="absolute bottom-[105%] left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500 text-white p-4 rounded-xl shadow-2xl w-80 backdrop-blur-xl">
                 <div className="flex justify-between items-start mb-2 border-b border-white/10 pb-2">
                    <h4 className="font-bold text-indigo-300 text-lg">{hoveredDef.name}</h4>
                    <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded uppercase tracking-wider">{hoveredDef.category}</span>
                </div>
                <p className="mb-3 text-slate-300 text-sm italic">{hoveredDef.description}</p>
                
                <div className="space-y-2 text-xs">
                    {hoveredLockedReasons.length > 0 && (
                        <div className="bg-red-950/50 border border-red-900/50 p-2 rounded mb-2">
                            {hoveredLockedReasons.map((reason, idx) => (
                                <div key={idx} className="text-red-400 font-bold flex items-center gap-1">
                                    <Lock size={10} /> {reason}
                                </div>
                            ))}
                        </div>
                    )}

                    {hoveredDef.type === BuildingType.BULLDOZER ? (
                        <div className="text-red-300 font-bold">Cliquez pour détruire.</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2 rounded">
                                <div className="flex flex-col">
                                    <span className="text-slate-500">Énergie</span>
                                    <span className={`font-mono font-bold ${hoveredDef.energyConsumption > 0 ? 'text-green-400' : hoveredDef.energyConsumption < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {hoveredDef.energyConsumption > 0 ? '+' : ''}{hoveredDef.energyConsumption}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-500">Revenu</span>
                                    <span className="font-mono font-bold text-yellow-400">+{hoveredDef.resourceGeneration || 0}</span>
                                </div>
                                {hoveredDef.waterConsumption && (
                                     <div className="flex flex-col">
                                        <span className="text-slate-500">Eau Req.</span>
                                        <span className="font-mono font-bold text-cyan-400">-{hoveredDef.waterConsumption}</span>
                                    </div>
                                )}
                                {hoveredDef.waterStorage && (
                                     <div className="flex flex-col">
                                        <span className="text-slate-500">Stock Eau</span>
                                        <span className="font-mono font-bold text-blue-400">+{hoveredDef.waterStorage}L</span>
                                    </div>
                                )}
                                {hoveredDef.workersProvided ? (
                                     <div className="flex flex-col">
                                        <span className="text-slate-500">Habitants</span>
                                        <span className="font-mono font-bold text-orange-400">+{hoveredDef.workersProvided}</span>
                                    </div>
                                ) : null}
                            </div>
                            
                            {Object.keys(hoveredDef.effects).length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {Object.entries(hoveredDef.effects).map(([k, v]) => {
                                        const val = v as number;
                                        const displayVal = val / STAT_MULT;
                                        return (
                                            <span key={k} className={`px-2 py-1 rounded font-mono ${val > 0 ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                                                {statNames[k as StatType]} {val > 0 ? '+' : ''}{displayVal.toFixed(0)}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
             </div>
        )}

        <div className="flex justify-center">
            <button 
                onClick={handleToggleMenu}
                className="bg-slate-900 text-slate-400 px-6 py-1 rounded-t-xl border-t border-l border-r border-slate-600 hover:text-white shadow-lg"
            >
                {isMenuOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
        </div>

        <div className="bg-slate-900/95 border-t border-indigo-500 shadow-2xl pb-4 px-4 rounded-t-lg">
            <div className="flex gap-1 overflow-x-auto mb-2 pt-2">
                {Object.values(BuildingCategory).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap
                            ${selectedCategory === cat 
                                ? 'bg-indigo-600 text-white shadow-lg' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}
                        `}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 min-h-[140px]">
                {Object.values(BUILDINGS)
                    .filter(b => b.type !== BuildingType.NONE && b.category === selectedCategory)
                    .map((b) => {
                        const lockedReasons = getLockStatus(b);
                        const isLocked = lockedReasons.length > 0;
                        
                        return (
                            <button
                                key={b.type}
                                onClick={() => !isLocked && onSelectBuilding(b.type)}
                                onMouseEnter={() => setHoveredBuildingType(b.type)}
                                onMouseLeave={() => setHoveredBuildingType(null)}
                                className={`
                                relative group flex flex-col items-center p-1 rounded-lg border-2 transition-all min-w-[100px] w-[100px] h-[130px] justify-between shrink-0
                                ${selectedBuilding === b.type 
                                    ? 'bg-slate-700 border-green-400 scale-105 shadow-lg' 
                                    : 'bg-black/40 border-slate-700 hover:bg-slate-800 hover:border-slate-500'}
                                ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                                `}
                            >
                                <div className="w-full h-16 relative rounded overflow-hidden">
                                    {b.type !== BuildingType.BULLDOZER ? (
                                        <BuildingPreview type={b.type} onRegister={onRegisterPreview} />
                                    ) : (
                                        <div className="w-full h-full bg-red-900/50 flex items-center justify-center"><Trash2 className="text-red-400"/></div>
                                    )}
                                </div>

                                {isLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50 rounded-lg">
                                        <Lock className="text-red-500 drop-shadow-md" size={24} />
                                    </div>
                                )}

                                <div className="text-center w-full px-1">
                                    <span className="text-[9px] font-bold text-white block truncate leading-tight mb-1">
                                        {b.name}
                                    </span>
                                    <div className={`flex items-center justify-center gap-1 text-[10px] font-mono ${isLocked ? 'text-red-400' : 'text-yellow-400'}`}>
                                        <DollarSign className="w-3 h-3" /> {b.cost}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
            </div>
        </div>
      </div>
    </div>
  );
};