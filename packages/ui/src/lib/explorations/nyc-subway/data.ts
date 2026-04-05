export interface SubwayStation {
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  borough: string;
}

export interface UnderservedArea {
  name: string;
  borough: string;
  population: number;
  medianIncome: number;
  nearestStationMiles: number;
  lat: number;
  lng: number;
  description: string;
}

export interface ProposedLine {
  id: string;
  name: string;
  description: string;
  lengthMiles: number;
  estimatedCostBillions: number;
  estimatedRidership: number;
  status: 'proposed' | 'planned' | 'under_construction' | 'advocacy';
  color: string;
  route: [number, number][];
  neighborhoods: string[];
  costPerMile: number;
  benefitScore: number;
}

export interface CostComparison {
  project: string;
  city: string;
  costPerMile: number;
  year: number;
  notes: string;
}

export interface BoroughStats {
  borough: string;
  population: number;
  stations: number;
  percentWithAccess: number;
  percentWithoutAccess: number;
  populationWithoutAccess: number;
  color: string;
}

// Key system-wide statistics
export const systemStats = {
  totalStations: 472,
  totalRouteMiles: 245,
  totalTrackMiles: 665,
  dailyRidership: 3_600_000,
  annualRidership: 1_100_000_000,
  percentNYCWithAccess: 55,
  populationWithinHalfMile: 4_700_000,
  populationBeyondHalfMile: 3_800_000,
  totalPopulation: 8_300_000,
  openingYear: 1904,
};

// Borough-level access statistics
export const boroughStats: BoroughStats[] = [
  {
    borough: 'Manhattan',
    population: 1_630_000,
    stations: 151,
    percentWithAccess: 95,
    percentWithoutAccess: 5,
    populationWithoutAccess: 81_500,
    color: '#e74c3c',
  },
  {
    borough: 'Brooklyn',
    population: 2_590_000,
    stations: 170,
    percentWithAccess: 65,
    percentWithoutAccess: 35,
    populationWithoutAccess: 906_500,
    color: '#3498db',
  },
  {
    borough: 'Queens',
    population: 2_270_000,
    stations: 81,
    percentWithAccess: 40,
    percentWithoutAccess: 60,
    populationWithoutAccess: 1_362_000,
    color: '#f39c12',
  },
  {
    borough: 'Bronx',
    population: 1_470_000,
    stations: 70,
    percentWithAccess: 50,
    percentWithoutAccess: 50,
    populationWithoutAccess: 735_000,
    color: '#2ecc71',
  },
  {
    borough: 'Staten Island',
    population: 475_000,
    stations: 0,
    percentWithAccess: 0,
    percentWithoutAccess: 100,
    populationWithoutAccess: 475_000,
    color: '#9b59b6',
  },
];

// Most underserved neighborhoods
export const underservedAreas: UnderservedArea[] = [
  {
    name: 'Throggs Neck',
    borough: 'Bronx',
    population: 46_000,
    medianIncome: 52_000,
    nearestStationMiles: 2.5,
    lat: 40.8195,
    lng: -73.8196,
    description:
      'Isolated peninsula community with no subway access. Residents depend entirely on buses, facing 60+ minute commutes to Midtown.',
  },
  {
    name: 'Co-op City',
    borough: 'Bronx',
    population: 44_000,
    medianIncome: 38_000,
    nearestStationMiles: 2.0,
    lat: 40.8743,
    lng: -73.8297,
    description:
      'One of the largest housing cooperatives in the world with no direct subway service. The 5 train terminus at Eastchester is over 2 miles away.',
  },
  {
    name: 'Canarsie',
    borough: 'Brooklyn',
    population: 84_000,
    medianIncome: 55_000,
    nearestStationMiles: 1.5,
    lat: 40.6389,
    lng: -73.9017,
    description:
      'Large Caribbean-American community at the southeastern edge of Brooklyn with limited L train service only at its western boundary.',
  },
  {
    name: 'Marine Park',
    borough: 'Brooklyn',
    population: 34_000,
    medianIncome: 78_000,
    nearestStationMiles: 2.0,
    lat: 40.6078,
    lng: -73.9228,
    description:
      'Residential neighborhood in southeastern Brooklyn with no subway service. The nearest stations on the B/Q are over 2 miles north.',
  },
  {
    name: 'Mill Basin',
    borough: 'Brooklyn',
    population: 25_000,
    medianIncome: 82_000,
    nearestStationMiles: 2.3,
    lat: 40.6069,
    lng: -73.9103,
    description:
      'Waterfront community completely cut off from the subway network.',
  },
  {
    name: 'Bayside',
    borough: 'Queens',
    population: 80_000,
    medianIncome: 72_000,
    nearestStationMiles: 2.0,
    lat: 40.7686,
    lng: -73.7694,
    description:
      'Large residential area in northeast Queens served only by LIRR and buses. No subway service despite significant population density.',
  },
  {
    name: 'Fresh Meadows',
    borough: 'Queens',
    population: 67_000,
    medianIncome: 60_000,
    nearestStationMiles: 1.8,
    lat: 40.7354,
    lng: -73.7801,
    description:
      'Central Queens neighborhood with no subway access, relying on lengthy bus transfers to reach the E/F trains.',
  },
  {
    name: 'Douglaston',
    borough: 'Queens',
    population: 22_000,
    medianIncome: 95_000,
    nearestStationMiles: 3.0,
    lat: 40.7638,
    lng: -73.7432,
    description:
      'Far eastern Queens community with the longest distance to any subway station in the borough.',
  },
  {
    name: 'Howard Beach',
    borough: 'Queens',
    population: 28_000,
    medianIncome: 68_000,
    nearestStationMiles: 1.5,
    lat: 40.6572,
    lng: -73.8363,
    description:
      'Served only by the A train at a single station. Most residents are over a mile from the station.',
  },
  {
    name: 'Southeast Queens (Laurelton/Rosedale)',
    borough: 'Queens',
    population: 92_000,
    medianIncome: 65_000,
    nearestStationMiles: 2.5,
    lat: 40.6677,
    lng: -73.7508,
    description:
      'Predominantly Black neighborhoods in southeast Queens, among the most transit-starved in the city. Residents face 90+ minute commutes.',
  },
  {
    name: 'Tottenville',
    borough: 'Staten Island',
    population: 26_000,
    medianIncome: 85_000,
    nearestStationMiles: 15.0,
    lat: 40.5083,
    lng: -74.2364,
    description:
      'The southernmost neighborhood in NYC, over 15 miles from the nearest subway station. Only reachable by car or extremely long bus rides.',
  },
  {
    name: 'East Harlem (above 125th)',
    borough: 'Manhattan',
    population: 58_000,
    medianIncome: 28_000,
    nearestStationMiles: 0.8,
    lat: 40.7992,
    lng: -73.9375,
    description:
      'Low-income community that will benefit from Second Avenue Subway Phase 2. Currently underserved by the Lexington Ave line.',
  },
];

// Proposed subway expansion lines
export const proposedLines: ProposedLine[] = [
  {
    id: 'sas-phase2',
    name: 'Second Ave Subway Phase 2',
    description:
      'Extend the Q train from 96th St north to 125th St in East Harlem, adding 3 new stations. Would serve one of Manhattan\'s most underserved and lowest-income communities.',
    lengthMiles: 1.5,
    estimatedCostBillions: 6.9,
    estimatedRidership: 100_000,
    status: 'planned',
    color: '#fccc0a',
    route: [
      [40.7846, -73.9517],
      [40.7922, -73.9472],
      [40.7978, -73.9419],
      [40.8030, -73.9375],
    ],
    neighborhoods: ['East Harlem', 'Upper East Side'],
    costPerMile: 4.6,
    benefitScore: 72,
  },
  {
    id: 'sas-phase3',
    name: 'Second Ave Subway Phase 3',
    description:
      'Extend southward from 63rd St to Houston St through the Lower East Side. Would relieve the chronically overcrowded Lexington Ave line.',
    lengthMiles: 1.8,
    estimatedCostBillions: 8.0,
    estimatedRidership: 150_000,
    status: 'proposed',
    color: '#fccc0a',
    route: [
      [40.7644, -73.9660],
      [40.7530, -73.9680],
      [40.7450, -73.9700],
      [40.7340, -73.9720],
      [40.7226, -73.9910],
    ],
    neighborhoods: ['Midtown East', 'Gramercy', 'East Village', 'Lower East Side'],
    costPerMile: 4.4,
    benefitScore: 85,
  },
  {
    id: 'sas-phase4',
    name: 'Second Ave Subway Phase 4',
    description:
      'Complete the full line from Houston St down to Hanover Square in the Financial District.',
    lengthMiles: 1.5,
    estimatedCostBillions: 6.5,
    estimatedRidership: 120_000,
    status: 'proposed',
    color: '#fccc0a',
    route: [
      [40.7226, -73.9910],
      [40.7127, -73.9930],
      [40.7063, -74.0010],
      [40.7042, -74.0094],
    ],
    neighborhoods: ['Lower East Side', 'Chinatown', 'Financial District'],
    costPerMile: 4.3,
    benefitScore: 70,
  },
  {
    id: 'ibx',
    name: 'Interborough Express (IBX)',
    description:
      'A new cross-borough light rail/BRT line connecting Bay Ridge, Brooklyn to Jackson Heights, Queens via an existing freight rail corridor. Would provide the first direct Brooklyn-Queens transit link without going through Manhattan.',
    lengthMiles: 14,
    estimatedCostBillions: 5.5,
    estimatedRidership: 115_000,
    status: 'planned',
    color: '#e67e22',
    route: [
      [40.6346, -74.0284],
      [40.6438, -73.9958],
      [40.6533, -73.9610],
      [40.6600, -73.9530],
      [40.6689, -73.9420],
      [40.6790, -73.9290],
      [40.6920, -73.9100],
      [40.7021, -73.9030],
      [40.7130, -73.9010],
      [40.7280, -73.8950],
      [40.7389, -73.8881],
      [40.7498, -73.8810],
    ],
    neighborhoods: [
      'Bay Ridge', 'Borough Park', 'Kensington', 'Flatbush',
      'Crown Heights', 'Bushwick', 'Ridgewood', 'Middle Village',
      'Maspeth', 'Woodside', 'Jackson Heights',
    ],
    costPerMile: 0.39,
    benefitScore: 92,
  },
  {
    id: 'utica',
    name: 'Utica Avenue Line',
    description:
      'A new subway line running south along Utica Avenue from the existing Eastern Parkway station down to Kings Plaza/Marine Park. Would connect dense, underserved, predominantly Black neighborhoods in central Brooklyn.',
    lengthMiles: 4.5,
    estimatedCostBillions: 8.0,
    estimatedRidership: 80_000,
    status: 'advocacy',
    color: '#8e44ad',
    route: [
      [40.6688, -73.9309],
      [40.6590, -73.9290],
      [40.6490, -73.9270],
      [40.6400, -73.9255],
      [40.6300, -73.9240],
      [40.6190, -73.9220],
      [40.6100, -73.9200],
    ],
    neighborhoods: [
      'Crown Heights', 'East Flatbush', 'Flatlands', 'Marine Park',
    ],
    costPerMile: 1.78,
    benefitScore: 88,
  },
  {
    id: 'triboro-full',
    name: 'Triboro Line (Full Subway)',
    description:
      'A full outer-borough subway connecting the Bronx, Queens, and Brooklyn along existing rail rights-of-way. More ambitious than IBX, this would be a heavy rail subway rather than light rail.',
    lengthMiles: 24,
    estimatedCostBillions: 25.0,
    estimatedRidership: 200_000,
    status: 'advocacy',
    color: '#1abc9c',
    route: [
      [40.6346, -74.0284],
      [40.6533, -73.9610],
      [40.6790, -73.9290],
      [40.7130, -73.9010],
      [40.7498, -73.8810],
      [40.7650, -73.8770],
      [40.7820, -73.8720],
      [40.8100, -73.8650],
      [40.8280, -73.8620],
      [40.8430, -73.8650],
    ],
    neighborhoods: [
      'Bay Ridge', 'Flatbush', 'Crown Heights', 'Bushwick',
      'Jackson Heights', 'Astoria', 'East Elmhurst', 'Co-op City',
    ],
    costPerMile: 1.04,
    benefitScore: 80,
  },
  {
    id: 'lga-extension',
    name: 'N/W Extension to LaGuardia',
    description:
      'Extend the N or W train from Astoria-Ditmars Blvd to LaGuardia Airport. NYC remains one of the only major cities without a direct rail link to its primary airport.',
    lengthMiles: 3.5,
    estimatedCostBillions: 4.0,
    estimatedRidership: 60_000,
    status: 'advocacy',
    color: '#2980b9',
    route: [
      [40.7752, -73.9120],
      [40.7790, -73.9020],
      [40.7810, -73.8900],
      [40.7740, -73.8740],
    ],
    neighborhoods: ['Astoria', 'East Elmhurst', 'LaGuardia Airport'],
    costPerMile: 1.14,
    benefitScore: 65,
  },
  {
    id: 'nostrand',
    name: 'Nostrand Avenue Extension',
    description:
      'Extend the 2/5 trains south from Flatbush Ave-Brooklyn College along Nostrand Avenue to Sheepshead Bay and Manhattan Beach. Originally planned in the 1929 IND expansion.',
    lengthMiles: 3.0,
    estimatedCostBillions: 5.5,
    estimatedRidership: 55_000,
    status: 'advocacy',
    color: '#e74c3c',
    route: [
      [40.6328, -73.9475],
      [40.6240, -73.9468],
      [40.6150, -73.9460],
      [40.5990, -73.9440],
      [40.5880, -73.9430],
    ],
    neighborhoods: ['Flatlands', 'Sheepshead Bay', 'Manhattan Beach'],
    costPerMile: 1.83,
    benefitScore: 60,
  },
];

// Historical and international cost comparisons
export const costComparisons: CostComparison[] = [
  {
    project: 'Second Ave Subway Phase 1',
    city: 'New York',
    costPerMile: 2.5,
    year: 2017,
    notes: '3 stations over 1.8 miles. $4.45B total. Most expensive subway per mile ever built at the time.',
  },
  {
    project: 'East Side Access (LIRR to Grand Central)',
    city: 'New York',
    costPerMile: 3.5,
    year: 2023,
    notes: '$11.2B for 3.5 miles of tunnel. Decades of delays and cost overruns.',
  },
  {
    project: '7 Train Extension to Hudson Yards',
    city: 'New York',
    costPerMile: 3.5,
    year: 2015,
    notes: '$2.4B for ~0.7 miles and 1 station. One of the most expensive single stations ever.',
  },
  {
    project: 'Crossrail (Elizabeth Line)',
    city: 'London',
    costPerMile: 1.1,
    year: 2022,
    notes: '$23B for 21 miles. Major cross-city rail link, but far cheaper per mile than NYC projects.',
  },
  {
    project: 'Grand Paris Express Line 15',
    city: 'Paris',
    costPerMile: 0.7,
    year: 2025,
    notes: 'Automated metro ring. ~$25B for 36 miles. Fraction of NYC costs.',
  },
  {
    project: 'Metro Line 3',
    city: 'Copenhagen',
    costPerMile: 0.45,
    year: 2019,
    notes: '$3.3B for 7.3 miles. Fully automated, modern system.',
  },
  {
    project: 'Subway Line 14 Extension',
    city: 'Paris',
    costPerMile: 0.6,
    year: 2024,
    notes: 'Automated metro extension for Olympics. Efficient, on-budget delivery.',
  },
  {
    project: 'Metro Line 5',
    city: 'Seoul',
    costPerMile: 0.25,
    year: 1996,
    notes: '32 miles of heavy rail. Built rapidly and affordably.',
  },
  {
    project: 'Metro (various lines)',
    city: 'Madrid',
    costPerMile: 0.3,
    year: 2007,
    notes: 'Spain built 40+ miles of metro in under a decade for a fraction of NYC\'s costs.',
  },
];

// Summary of proposed lines ranked by benefit-to-cost ratio
export function getLinesByBenefitScore(): ProposedLine[] {
  return [...proposedLines].sort((a, b) => b.benefitScore - a.benefitScore);
}

export function getTotalProposedCost(): number {
  return proposedLines.reduce((sum, line) => sum + line.estimatedCostBillions, 0);
}

export function getTotalProposedRidership(): number {
  return proposedLines.reduce((sum, line) => sum + line.estimatedRidership, 0);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export function formatDollars(billions: number): string {
  return `$${billions.toFixed(1)}B`;
}
