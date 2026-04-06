// F Train: W 4th St → Church Ave — real route data for signal simulation

export const ROUTE_LENGTH_M = 8850;

// --- Physics (R160 cars) ---
export const PHYSICS = {
  VMAX_MPS: 25,          // ~55 mph absolute max
  TYPICAL_MAX_MPS: 17.9, // ~40 mph typical between stations
  ACC_MPS2: 1.1,         // Service acceleration
  BRK_MPS2: 1.3,         // Service braking
  EBRK_MPS2: 2.0,        // Emergency braking
  TRAIN_LENGTH_M: 153,   // 8-car R160 consist (~19m per car)
};

// --- Stations ---
export interface StationDef {
  name: string;
  shortName: string;
  positionM: number;
  dwellSeconds: number;
  transferLines: string[];
  junctionId?: string;
}

export const STATIONS: StationDef[] = [
  {
    name: 'W 4th St',
    shortName: 'W 4th',
    positionM: 0,
    dwellSeconds: 25,
    transferLines: ['A', 'C', 'E', 'B', 'D', 'M'],
    junctionId: 'w4th',
  },
  {
    name: 'Broadway-Lafayette',
    shortName: 'Bway-Laf',
    positionM: 400,
    dwellSeconds: 25,
    transferLines: ['B', 'D', 'M', '6'],
    junctionId: 'bway-laf',
  },
  {
    name: '2nd Ave',
    shortName: '2nd Ave',
    positionM: 1050,
    dwellSeconds: 20,
    transferLines: [],
  },
  {
    name: 'Delancey-Essex',
    shortName: 'Delancey',
    positionM: 1500,
    dwellSeconds: 25,
    transferLines: ['J', 'M', 'Z'],
    junctionId: 'delancey',
  },
  {
    name: 'East Broadway',
    shortName: 'E Bway',
    positionM: 2000,
    dwellSeconds: 20,
    transferLines: [],
  },
  {
    name: 'York St',
    shortName: 'York',
    positionM: 2650,
    dwellSeconds: 20,
    transferLines: [],
  },
  {
    name: 'Jay St-MetroTech',
    shortName: 'Jay St',
    positionM: 3500,
    dwellSeconds: 30,
    transferLines: ['A', 'C', 'R'],
    junctionId: 'jay-st',
  },
  {
    name: 'Bergen St',
    shortName: 'Bergen',
    positionM: 4200,
    dwellSeconds: 20,
    transferLines: ['G'],
    junctionId: 'fg-shared',
  },
  {
    name: 'Carroll St',
    shortName: 'Carroll',
    positionM: 4700,
    dwellSeconds: 20,
    transferLines: ['G'],
    junctionId: 'fg-shared',
  },
  {
    name: 'Smith-9 Sts',
    shortName: 'Smith-9',
    positionM: 5200,
    dwellSeconds: 22,
    transferLines: ['G'],
    junctionId: 'fg-shared',
  },
  {
    name: '4th Ave-9th St',
    shortName: '4th Ave',
    positionM: 5700,
    dwellSeconds: 22,
    transferLines: ['G', 'R'],
    junctionId: 'fg-shared',
  },
  {
    name: '7th Ave',
    shortName: '7th Ave',
    positionM: 6300,
    dwellSeconds: 25,
    transferLines: ['G'],
    junctionId: 'fg-shared',
  },
  {
    name: '15th St-Prospect Park',
    shortName: '15th St',
    positionM: 6900,
    dwellSeconds: 22,
    transferLines: ['G'],
    junctionId: 'fg-shared',
  },
  {
    name: 'Fort Hamilton Pkwy',
    shortName: 'Ft Ham',
    positionM: 7700,
    dwellSeconds: 20,
    transferLines: [],
  },
  {
    name: 'Church Ave',
    shortName: 'Church',
    positionM: 8850,
    dwellSeconds: 25,
    transferLines: [],
  },
];

// --- Junctions ---
export interface JunctionDef {
  id: string;
  positionM: number;
  conflictingLines: string[];
  conflictIntervalS: number;  // Average seconds between conflicts
  conflictDurationS: number;  // How long a conflict locks the junction
  cbtcDurationS: number;      // Shorter lock under CBTC
}

export const JUNCTIONS: JunctionDef[] = [
  {
    id: 'w4th',
    positionM: 0,
    conflictingLines: ['A', 'C', 'E'],
    conflictIntervalS: 150,
    conflictDurationS: 18,
    cbtcDurationS: 6,
  },
  {
    id: 'bway-laf',
    positionM: 400,
    conflictingLines: ['B', 'D'],
    conflictIntervalS: 200,
    conflictDurationS: 15,
    cbtcDurationS: 5,
  },
  {
    id: 'delancey',
    positionM: 1500,
    conflictingLines: ['J', 'M', 'Z'],
    conflictIntervalS: 200,
    conflictDurationS: 12,
    cbtcDurationS: 4,
  },
  {
    id: 'jay-st',
    positionM: 3500,
    conflictingLines: ['A', 'C'],
    conflictIntervalS: 120,
    conflictDurationS: 22,
    cbtcDurationS: 7,
  },
  {
    id: 'fg-shared',
    positionM: 5500, // approximate center of shared section
    conflictingLines: ['G'],
    conflictIntervalS: 240,
    conflictDurationS: 15,
    cbtcDurationS: 5,
  },
];

// --- Speed Restrictions ---
export interface SpeedRestriction {
  startM: number;
  endM: number;
  maxSpeedMps: number;
  reason: string;
}

export const SPEED_RESTRICTIONS: SpeedRestriction[] = [
  { startM: 2400, endM: 2900, maxSpeedMps: 11.2, reason: 'York St curve' }, // ~25 mph
  { startM: 3300, endM: 3700, maxSpeedMps: 13.4, reason: 'Jay St junction switches' }, // ~30 mph
  { startM: 4900, endM: 5400, maxSpeedMps: 11.2, reason: 'Smith-9 Sts elevated curve' }, // ~25 mph
];

// --- Fixed Block Config ---
export const FIXED_BLOCK = {
  YELLOW_SPEED_MPS: 6.7, // 15 mph approach speed
};

// Generate blocks of varying length (shorter near stations, longer between)
export function generateBlocks(): { startM: number; endM: number }[] {
  const blocks: { startM: number; endM: number }[] = [];
  let pos = 0;
  while (pos < ROUTE_LENGTH_M) {
    // Shorter blocks near stations (100-150m), longer between (200-300m)
    const nearStation = STATIONS.some(
      (s) => Math.abs(s.positionM - pos) < 300,
    );
    const len = nearStation ? 100 + Math.random() * 50 : 200 + Math.random() * 100;
    const end = Math.min(pos + len, ROUTE_LENGTH_M);
    blocks.push({ startM: pos, endM: end });
    pos = end;
  }
  return blocks;
}

// --- MTA line colors (for transfer indicators) ---
export const LINE_COLORS: Record<string, string> = {
  A: '#2850AD',
  C: '#2850AD',
  E: '#2850AD',
  B: '#FF6319',
  D: '#FF6319',
  F: '#FF6319',
  M: '#FF6319',
  G: '#6CBE45',
  J: '#996633',
  Z: '#996633',
  N: '#FCCC0A',
  Q: '#FCCC0A',
  R: '#FCCC0A',
  W: '#FCCC0A',
  '1': '#EE352E',
  '2': '#EE352E',
  '3': '#EE352E',
  '4': '#00933C',
  '5': '#00933C',
  '6': '#00933C',
  '7': '#B933AD',
  L: '#A7A9AC',
  S: '#808183',
};

// Measurement point for TPH (between Jay St and Bergen St, clear of junction lock zones)
export const TPH_MEASUREMENT_M = 4050;
