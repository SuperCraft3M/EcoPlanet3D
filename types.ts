import React from 'react';

// Augment the global JSX namespace to recognize Three.js elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // React Three Fiber elements
      group: any;
      mesh: any;
      primitive: any;
      
      // Geometries
      boxGeometry: any;
      cylinderGeometry: any;
      sphereGeometry: any;
      coneGeometry: any;
      dodecahedronGeometry: any;
      octahedronGeometry: any;
      torusGeometry: any;
      planeGeometry: any;
      circleGeometry: any;
      ringGeometry: any;
      
      // Materials
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      meshPhongMaterial: any;

      // Lights
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      spotLight: any;
      hemisphereLight: any;

      // Helpers & Misc
      gridHelper: any;
      arrowHelper: any;
      axesHelper: any;
      color: any;

      // Allow any element for React Three Fiber to avoid type errors
      [elemName: string]: any;
    }
  }
}

export enum ResourceType {
  MONEY = 'MONEY',
  ENERGY = 'ENERGY',
  WATER = 'WATER',
}

export enum StatType {
  AIR = 'AIR',
  GREENERY = 'GREENERY',
  WIND = 'WIND',
  EARTH = 'EARTH',
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum GamePhase {
  MENU = 'MENU',
  PLAYING = 'PLAYING'
}

export enum BuildingCategory {
  ENERGY = 'Énergie',
  INDUSTRY = 'Industrie',
  LIVING = 'Habitation',
  NATURE = 'Nature',
  TERRAFORM = 'Terraformation',
  CIVIC = 'Civique',
  TOOLS = 'Outils'
}

export enum BuildingType {
  NONE = 'NONE',
  BULLDOZER = 'BULLDOZER',
  
  // ENERGY
  SOLAR_PANEL_SMALL = 'SOLAR_PANEL_SMALL',
  SOLAR_PANEL_LARGE = 'SOLAR_PANEL_LARGE',
  SOLAR_ORBITAL_UPLINK = 'SOLAR_ORBITAL_UPLINK',
  WIND_TURBINE = 'WIND_TURBINE',
  WIND_TURBINE_OFFSHORE = 'WIND_TURBINE_OFFSHORE',
  COAL_PLANT = 'COAL_PLANT',
  GAS_PLANT = 'GAS_PLANT',
  GEOTHERMAL_PLANT = 'GEOTHERMAL_PLANT',
  HYDRO_DAM = 'HYDRO_DAM',
  NUCLEAR_PLANT = 'NUCLEAR_PLANT',
  FUSION_REACTOR = 'FUSION_REACTOR',
  ANTIMATTER_REACTOR = 'ANTIMATTER_REACTOR',
  BIOMASS_BURNER = 'BIOMASS_BURNER',

  // INDUSTRY
  MINE_IRON = 'MINE_IRON',
  MINE_SILICON = 'MINE_SILICON',
  MINE_GOLD = 'MINE_GOLD',
  MINE_TITANIUM = 'MINE_TITANIUM',
  MINE_LITHIUM = 'MINE_LITHIUM',
  MINE_URANIUM = 'MINE_URANIUM',
  FACTORY_SMALL = 'FACTORY_SMALL',
  FACTORY_LARGE = 'FACTORY_LARGE',
  FACTORY_ROBOTICS = 'FACTORY_ROBOTICS',
  FACTORY_AEROSPACE = 'FACTORY_AEROSPACE',
  FACTORY_CHIP = 'FACTORY_CHIP',
  RECYCLING_CENTER = 'RECYCLING_CENTER',
  ORBITAL_DOCK = 'ORBITAL_DOCK',

  // LIVING
  TENT = 'TENT',
  SHACK = 'SHACK',
  HOUSE = 'HOUSE',
  DUPLEX = 'DUPLEX',
  APARTMENT = 'APARTMENT',
  CONDO_COMPLEX = 'CONDO_COMPLEX',
  SKYSCRAPER = 'SKYSCRAPER',
  ARCOLOGY = 'ARCOLOGY',
  UNDERGROUND_BUNKER = 'UNDERGROUND_BUNKER',
  DOME_CITY = 'DOME_CITY',
  MALL = 'MALL',
  HOTEL = 'HOTEL',
  ROBOT_HIVE = 'ROBOT_HIVE', 

  // CIVIC
  SCHOOL = 'SCHOOL',
  UNIVERSITY = 'UNIVERSITY',
  HOSPITAL = 'HOSPITAL',
  DATA_CENTER = 'DATA_CENTER',
  BANK = 'BANK',

  // NATURE
  SMALL_TREE = 'SMALL_TREE',
  LARGE_TREE = 'LARGE_TREE',
  FOREST_GROVE = 'FOREST_GROVE',
  GARDEN = 'GARDEN',
  PARK = 'PARK',
  BOTANICAL_GARDEN = 'BOTANICAL_GARDEN',
  LAKE = 'LAKE',
  RIVER_SEGMENT = 'RIVER_SEGMENT',
  CORAL_REEF = 'CORAL_REEF',
  ALGAE_FARM = 'ALGAE_FARM',
  RAIN_COLLECTOR = 'RAIN_COLLECTOR', 
  WATER_TANK = 'WATER_TANK', 
  ATMOSPHERIC_CONDENSER = 'ATMOSPHERIC_CONDENSER',

  // TERRAFORM
  AIR_FILTER = 'AIR_FILTER',
  CO2_SCRUBBER = 'CO2_SCRUBBER',
  OXYGEN_DIFFUSER = 'OXYGEN_DIFFUSER',
  CLOUD_SEEDER = 'CLOUD_SEEDER',
  WEATHER_STATION = 'WEATHER_STATION',
  OZONE_GENERATOR = 'OZONE_GENERATOR',
  HEATER = 'HEATER',
  COOLER = 'COOLER',
  CORE_DRILL = 'CORE_DRILL',
  TECTONIC_STABILIZER = 'TECTONIC_STABILIZER',
  
  // DEPOLLUTION
  DEPOLLUTION_NODE_SMALL = 'DEPOLLUTION_NODE_SMALL',
  DEPOLLUTION_NODE_LARGE = 'DEPOLLUTION_NODE_LARGE'
}

export interface BuildingDef {
  type: BuildingType;
  name: string;
  description: string;
  category: BuildingCategory;
  cost: number;
  energyConsumption: number; 
  waterConsumption?: number; 
  
  // Logic mechanics
  workersRequired?: number; 
  workersProvided?: number;
  isRobot?: boolean; 
  isSolar?: boolean; 
  
  // Environment interaction
  minStats?: Partial<Record<StatType, number>>; 
  statScaling?: Partial<Record<StatType, number>>; 
  
  effects: Partial<Record<StatType, number>>; 
  resourceGeneration?: number;
  waterGeneration?: number; 
  waterStorage?: number; // New
  pollutionRadius?: number; 
  pollutionAmount?: number; 
  pollutionCapReduction?: number;
  
  color: string; 
  scale: [number, number, number];
  size: [number, number]; // [Width, Depth] in grid cells
}

export interface Cell {
  x: number;
  y: number;
  building: BuildingType | null;
  refX?: number; // Reference to the anchor cell x (top-left) of the building
  refY?: number; // Reference to the anchor cell y (top-left) of the building
  pollution: number; 
  pollutionCap: number; 
  waterLevel: number; 
  isActive: boolean; 
  isPowered: boolean; 
  efficiency: number; 
}

export interface GameState {
  gamePhase: GamePhase;
  difficulty: Difficulty;
  mapSize: number;
  resources: {
    money: number;
    lastIncome: number;
    energy: number;
    energyDemand: number; // Added to track theoretical demand
    maxEnergy: number;
    water: number; 
    maxWater: number;
    workforce: number;
    workforceDemand: number;
  };
  stats: Record<StatType, number>;
  grid: Cell[][];
  tickCount: number;
  timeOfDay: number; // 0.0 to 24.0
  isRaining: boolean;
  rainTimer: number; // New: Duration of rain remaining in ticks
  settings: {
    animations: boolean;
    timeSpeed: number; // 1, 2, 4
  };
}

export interface GridPosition {
  x: number;
  y: number;
}