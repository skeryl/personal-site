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

// Sources referenced throughout this file — rendered as footnotes in the exploration
export interface Source {
	id: string;
	label: string;
	url: string;
}

export const sources: Source[] = [
	{
		id: 'mta-facts',
		label: 'MTA Subway Facts & Figures',
		url: 'https://www.nycsubway.org/wiki/Subway_FAQ:_Facts_and_Figures'
	},
	{
		id: 'mta-ridership-2025',
		label: 'Governor Hochul, MTA Record Ridership 2025',
		url: 'https://www.governor.ny.gov/news/governor-hochul-highlights-record-breaking-year-performance-and-ridership-mta-2025'
	},
	{
		id: 'census-2020',
		label: 'NYC Planning, 2020 Census Briefing',
		url: 'https://www.nyc.gov/assets/planning/download/pdf/planning-level/nyc-population/census2020/dcp_2020-census-briefing-booklet-1.pdf'
	},
	{
		id: 'mta-cbtc',
		label: 'MTA CBTC Signal Upgrades',
		url: 'https://www.mta.info/project/cbtc-signal-upgrades'
	},
	{
		id: 'sas-phase2',
		label: 'Governor Hochul, SAS Phase 2 Tunneling Contract',
		url: 'https://www.governor.ny.gov/news/governor-hochul-announces-second-avenue-subway-phase-2-moving-forward-award-tunneling-contract'
	},
	{
		id: 'ibx',
		label: 'MTA Interborough Express',
		url: 'https://www.mta.info/project/interborough-express'
	},
	{
		id: 'sas-phase1',
		label: 'MTA, Second Avenue Subway Phase 1',
		url: 'https://www.mta.info/project/second-avenue-subway-phase-1'
	},
	{
		id: 'esa',
		label: 'MTA, East Side Access',
		url: 'https://www.mta.info/project/east-side-access'
	},
	{
		id: '7ext',
		label: 'MTA, 7 Line Extension to Hudson Yards',
		url: 'https://www.mta.info/project/flushing-line'
	},
	{
		id: 'crossrail',
		label: 'UK National Audit Office, Crossrail Progress Update',
		url: 'https://www.nao.org.uk/reports/crossrail-progress-update/'
	},
	{
		id: 'gpe',
		label: 'Société du Grand Paris (official project site)',
		url: 'https://www.societedugrandparis.fr/investors'
	},
	{
		id: 'cph-metro',
		label: 'Metroselskabet, Cityringen',
		url: 'https://m.dk/en/routes-and-timetables/cityring/'
	},
	{
		id: 'paris14',
		label: 'RATP, Extension of Métro Line 14',
		url: 'https://www.ratp.fr/en/extension-metro-line-14'
	},
	{
		id: 'madrid-wip',
		label: 'Works in Progress: How Madrid Built Its Metro',
		url: 'https://worksinprogress.co/issue/how-madrid-built-its-metro-cheaply/'
	},
	{ id: 'transit-costs', label: 'NYU Transit Costs Project', url: 'https://transitcosts.com/' },
	{
		id: 'eno-korea',
		label: 'Eno Center for Transportation, South Korea Case Study',
		url: 'https://projectdelivery.enotrans.org/case-studies/south-korea/'
	},
	{
		id: 'acs-2023',
		label: 'U.S. Census Bureau, American Community Survey 2023',
		url: 'https://data.census.gov/'
	}
];

// Key system-wide statistics [mta-facts] [mta-ridership-2025] [census-2020]
export const systemStats = {
	totalStations: 472,
	totalRouteMiles: 248,
	totalTrackMiles: 665,
	dailyRidership: 3_600_000, // 2024 avg weekday ~3.4M, 2025 peaked at 4M; using ~3.6M as representative
	annualRidership: 1_300_000_000, // ~1.3B linked trips (2025). Prior figure of 2.31B was unlinked/non-unique.
	percentNYCWithAccess: 81,
	populationWithinHalfMile: 7_100_000,
	populationBeyondHalfMile: 1_700_000,
	totalPopulation: 8_800_000, // 2020 Census: 8,804,190
	percentHouseholdsUnderserved: 29,
	openingYear: 1904
};

// Borough-level access statistics [census-2020]
export const boroughStats: BoroughStats[] = [
	{
		borough: 'Manhattan',
		population: 1_694_000, // 2020 Census: 1,694,251
		stations: 151,
		percentWithAccess: 99,
		percentWithoutAccess: 1,
		populationWithoutAccess: 17_000,
		color: '#e74c3c'
	},
	{
		borough: 'Brooklyn',
		population: 2_736_000, // 2020 Census: 2,736,074
		stations: 170,
		percentWithAccess: 90,
		percentWithoutAccess: 10,
		populationWithoutAccess: 274_000,
		color: '#3498db'
	},
	{
		borough: 'Queens',
		population: 2_405_000, // 2020 Census: 2,405,464
		stations: 81,
		percentWithAccess: 61,
		percentWithoutAccess: 39,
		populationWithoutAccess: 938_000,
		color: '#f39c12'
	},
	{
		borough: 'Bronx',
		population: 1_473_000, // 2020 Census: 1,472,654
		stations: 70,
		percentWithAccess: 89,
		percentWithoutAccess: 11,
		populationWithoutAccess: 162_000,
		color: '#2ecc71'
	},
	{
		borough: 'Staten Island',
		population: 496_000, // 2020 Census: 495,747
		stations: 0,
		percentWithAccess: 52,
		percentWithoutAccess: 48,
		populationWithoutAccess: 238_000,
		color: '#9b59b6'
	}
];

// Most underserved neighborhoods [acs-2023] [census-2020]
// Populations from 2020 Census, incomes from 2023 ACS estimates
export const underservedAreas: UnderservedArea[] = [
	{
		name: 'Throggs Neck',
		borough: 'Bronx',
		population: 46_000,
		medianIncome: 90_000,
		nearestStationMiles: 2.5,
		lat: 40.8195,
		lng: -73.8196,
		description:
			'Isolated peninsula community with no subway access. Residents depend entirely on buses, facing 60+ minute commutes to Midtown.'
	},
	{
		name: 'Co-op City',
		borough: 'Bronx',
		population: 43_000,
		medianIncome: 62_000,
		nearestStationMiles: 2.0,
		lat: 40.8743,
		lng: -73.8297,
		description:
			'One of the largest housing cooperatives in the world with no direct subway service. The 5 train terminus at Eastchester is over 2 miles away.'
	},
	{
		name: 'Canarsie',
		borough: 'Brooklyn',
		population: 84_000,
		medianIncome: 68_000,
		nearestStationMiles: 1.5,
		lat: 40.6389,
		lng: -73.9017,
		description:
			'Large Caribbean-American community at the southeastern edge of Brooklyn with limited L train service only at its western boundary.'
	},
	{
		name: 'Marine Park',
		borough: 'Brooklyn',
		population: 34_000,
		medianIncome: 98_000,
		nearestStationMiles: 2.0,
		lat: 40.6078,
		lng: -73.9228,
		description:
			'Residential neighborhood in southeastern Brooklyn with no subway service. The nearest stations on the B/Q are over 2 miles north.'
	},
	{
		name: 'Mill Basin',
		borough: 'Brooklyn',
		population: 25_000,
		medianIncome: 95_000,
		nearestStationMiles: 2.3,
		lat: 40.6069,
		lng: -73.9103,
		description: 'Waterfront community completely cut off from the subway network.'
	},
	{
		name: 'Bayside',
		borough: 'Queens',
		population: 80_000,
		medianIncome: 88_000,
		nearestStationMiles: 2.0,
		lat: 40.7686,
		lng: -73.7694,
		description:
			'Large residential area in northeast Queens served only by LIRR and buses. No subway service despite significant population density.'
	},
	{
		name: 'Fresh Meadows',
		borough: 'Queens',
		population: 67_000,
		medianIncome: 78_000,
		nearestStationMiles: 1.8,
		lat: 40.7354,
		lng: -73.7801,
		description:
			'Central Queens neighborhood with no subway access, relying on lengthy bus transfers to reach the E/F trains.'
	},
	{
		name: 'Douglaston',
		borough: 'Queens',
		population: 22_000,
		medianIncome: 120_000,
		nearestStationMiles: 3.0,
		lat: 40.7638,
		lng: -73.7432,
		description:
			'Far eastern Queens community with the longest distance to any subway station in the borough.'
	},
	{
		name: 'Howard Beach',
		borough: 'Queens',
		population: 28_000,
		medianIncome: 82_000,
		nearestStationMiles: 1.5,
		lat: 40.6572,
		lng: -73.8363,
		description:
			'Served only by the A train at a single station. Most residents are over a mile from the station.'
	},
	{
		name: 'Southeast Queens (Laurelton/Rosedale)',
		borough: 'Queens',
		population: 55_000,
		medianIncome: 112_000,
		nearestStationMiles: 2.5,
		lat: 40.6677,
		lng: -73.7508,
		description:
			'Predominantly Black neighborhoods in southeast Queens, among the most transit-starved in the city. Residents face 90+ minute commutes despite relatively high incomes.'
	},
	{
		name: 'Tottenville',
		borough: 'Staten Island',
		population: 14_500,
		medianIncome: 131_000,
		nearestStationMiles: 15.0,
		lat: 40.5083,
		lng: -74.2364,
		description:
			'The southernmost neighborhood in NYC, over 15 miles from the nearest subway station. Only reachable by car or extremely long bus rides.'
	},
	{
		name: 'College Point',
		borough: 'Queens',
		population: 34_000,
		medianIncome: 84_000,
		nearestStationMiles: 2.2,
		lat: 40.7862,
		lng: -73.8461,
		description:
			'Isolated neighborhood on a peninsula in northern Queens with zero subway stations. The 7 train passes nearby but has no stop here.'
	},
	{
		name: 'Flatlands',
		borough: 'Brooklyn',
		population: 75_000,
		medianIncome: 66_000,
		nearestStationMiles: 1.5,
		lat: 40.6233,
		lng: -73.9314,
		description:
			'Has zero subway stations within its boundaries. Residents depend entirely on buses for a neighborhood of 75,000 people.'
	},
	{
		name: 'East Harlem (above 125th)',
		borough: 'Manhattan',
		population: 58_000,
		medianIncome: 32_000,
		nearestStationMiles: 0.8,
		lat: 40.7992,
		lng: -73.9375,
		description:
			'Low-income community that will benefit from Second Avenue Subway Phase 2. Currently underserved by the Lexington Ave line.'
	}
];

// Proposed subway expansion lines [sas-phase2] [ibx]
export const proposedLines: ProposedLine[] = [
	{
		id: 'sas-phase2',
		name: 'Second Ave Subway Phase 2',
		description:
			'Extend the Q train from 96th St north to 125th St in East Harlem, adding 3 new stations at 106th, 116th, and 125th/Lex. Tunneling contract ($1.97B) awarded Aug 2025. Target opening: 2032.',
		lengthMiles: 1.5,
		estimatedCostBillions: 6.0,
		estimatedRidership: 100_000,
		status: 'under_construction',
		color: '#fccc0a',
		route: [
			[40.7846, -73.9517],
			[40.7922, -73.9472],
			[40.7978, -73.9419],
			[40.803, -73.9375]
		],
		neighborhoods: ['East Harlem', 'Upper East Side'],
		costPerMile: 4.0,
		benefitScore: 72
	},
	{
		id: 'sas-125th-west',
		name: 'Second Ave Subway 125th St Westward',
		description:
			'Extend from 125th/Lex westward along 125th St to Broadway with 3 new stations at Lenox Ave, St. Nicholas Ave, and Broadway. Feasibility study published Jan 2026. Would connect East and West Harlem.',
		lengthMiles: 1.2,
		estimatedCostBillions: 6.0,
		estimatedRidership: 70_000,
		status: 'proposed',
		color: '#fccc0a',
		route: [
			[40.803, -73.9375],
			[40.804, -73.944],
			[40.8048, -73.952],
			[40.8055, -73.9585]
		],
		neighborhoods: ['East Harlem', 'Central Harlem', 'West Harlem'],
		costPerMile: 5.0,
		benefitScore: 68
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
			[40.7644, -73.966],
			[40.753, -73.968],
			[40.745, -73.97],
			[40.734, -73.972],
			[40.7226, -73.991]
		],
		neighborhoods: ['Midtown East', 'Gramercy', 'East Village', 'Lower East Side'],
		costPerMile: 4.4,
		benefitScore: 85
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
			[40.7226, -73.991],
			[40.7127, -73.993],
			[40.7063, -74.001],
			[40.7042, -74.0094]
		],
		neighborhoods: ['Lower East Side', 'Chinatown', 'Financial District'],
		costPerMile: 4.3,
		benefitScore: 70
	},
	{
		id: 'ibx',
		name: 'Interborough Express (IBX)',
		description:
			'A 14-mile light metro with 19 stations connecting Bay Ridge, Brooklyn to Jackson Heights, Queens via an existing freight rail corridor. First $2.75B funded in MTA 2025-2029 Capital Plan. Would connect with 17 existing subway lines and provide the first direct Brooklyn-Queens transit link without going through Manhattan. End-to-end in under 32 minutes.',
		lengthMiles: 14,
		estimatedCostBillions: 5.5,
		estimatedRidership: 160_000,
		status: 'planned',
		color: '#e67e22',
		route: [
			[40.6346, -74.0284],
			[40.6438, -73.9958],
			[40.6533, -73.961],
			[40.66, -73.953],
			[40.6689, -73.942],
			[40.679, -73.929],
			[40.692, -73.91],
			[40.7021, -73.903],
			[40.713, -73.901],
			[40.728, -73.895],
			[40.7389, -73.8881],
			[40.7498, -73.881]
		],
		neighborhoods: [
			'Bay Ridge',
			'Borough Park',
			'Kensington',
			'Flatbush',
			'Crown Heights',
			'Bushwick',
			'Ridgewood',
			'Middle Village',
			'Maspeth',
			'Woodside',
			'Jackson Heights'
		],
		costPerMile: 0.39,
		benefitScore: 92
	},
	{
		id: 'utica',
		name: 'Utica Avenue Line',
		description:
			'A new subway line running south along Utica Avenue from the existing Eastern Parkway station down to Kings Plaza/Marine Park. The B46 bus on Utica Ave already carries 44,000 riders/day (3rd busiest bus in NYC), demonstrating massive latent demand. Would connect dense, underserved, predominantly Black neighborhoods in central Brooklyn.',
		lengthMiles: 4.5,
		estimatedCostBillions: 8.0,
		estimatedRidership: 80_000,
		status: 'advocacy',
		color: '#8e44ad',
		route: [
			[40.6688, -73.9309],
			[40.659, -73.929],
			[40.649, -73.927],
			[40.64, -73.9255],
			[40.63, -73.924],
			[40.619, -73.922],
			[40.61, -73.92]
		],
		neighborhoods: ['Crown Heights', 'East Flatbush', 'Flatlands', 'Marine Park'],
		costPerMile: 1.78,
		benefitScore: 88
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
			[40.6533, -73.961],
			[40.679, -73.929],
			[40.713, -73.901],
			[40.7498, -73.881],
			[40.765, -73.877],
			[40.782, -73.872],
			[40.81, -73.865],
			[40.828, -73.862],
			[40.843, -73.865]
		],
		neighborhoods: [
			'Bay Ridge',
			'Flatbush',
			'Crown Heights',
			'Bushwick',
			'Jackson Heights',
			'Astoria',
			'East Elmhurst',
			'Co-op City'
		],
		costPerMile: 1.04,
		benefitScore: 80
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
			[40.7752, -73.912],
			[40.779, -73.902],
			[40.781, -73.89],
			[40.774, -73.874]
		],
		neighborhoods: ['Astoria', 'East Elmhurst', 'LaGuardia Airport'],
		costPerMile: 1.14,
		benefitScore: 65
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
			[40.624, -73.9468],
			[40.615, -73.946],
			[40.599, -73.944],
			[40.588, -73.943]
		],
		neighborhoods: ['Flatlands', 'Sheepshead Bay', 'Manhattan Beach'],
		costPerMile: 1.83,
		benefitScore: 60
	}
];

// Historical and international cost comparisons [sas-phase1] [esa] [7ext] [crossrail] [gpe] [cph-metro] [paris14] [madrid-wip] [eno-korea] [transit-costs]
export const costComparisons: CostComparison[] = [
	{
		project: 'Second Ave Subway Phase 1',
		city: 'New York',
		costPerMile: 2.5,
		year: 2017,
		notes:
			'3 stations over 1.8 miles. $4.45B total. Most expensive subway per mile ever built at the time.'
	},
	{
		project: 'East Side Access (LIRR to Grand Central)',
		city: 'New York',
		costPerMile: 3.2, // $11.1B / 3.5mi of tunnel
		year: 2023,
		notes: '$11.1B for 3.5 miles of new tunnel. Decades of delays and cost overruns.'
	},
	{
		project: '7 Train Extension to Hudson Yards',
		city: 'New York',
		costPerMile: 1.6, // $2.42B / 1.5mi (was incorrectly listed as ~1mi)
		year: 2015,
		notes: '$2.42B for 1.5 miles and 1 station. One of the most expensive single stations ever.'
	},
	{
		project: 'Crossrail (Elizabeth Line)',
		city: 'London',
		costPerMile: 1.8, // £18.9B (~$23B) for 13mi (21km) of new twin-bore tunnel route
		year: 2022,
		notes:
			'~£18.9B (~$23B) for 13 miles of new tunnel (73 miles total line). Major cross-city rail link.'
	},
	{
		project: 'Grand Paris Express (all lines)',
		city: 'Paris',
		costPerMile: 0.37, // ~€42B (~$46B) for 124mi total
		year: 2030,
		notes:
			'~€42B for 124 miles of automated metro across 4 new lines. Largest transit project in Europe.'
	},
	{
		project: 'Metro Line 3 (Cityringen)',
		city: 'Copenhagen',
		costPerMile: 0.4, // ~25.3B DKK (~$3.8B) / 9.6mi (15.5km)
		year: 2019,
		notes: '~25B DKK (~$3.8B) for 9.6 miles. Fully automated, driverless system.'
	},
	{
		project: 'Métro Line 14 Extension',
		city: 'Paris',
		costPerMile: 0.35, // ~€3B (~$3.3B) / 8.6mi (13.9km of extensions)
		year: 2024,
		notes: '~€3B for 8.6 miles of extensions. Automated metro extended for the Olympics.'
	},
	{
		project: 'Metro Line 5',
		city: 'Seoul',
		costPerMile: 0.25,
		year: 1996,
		notes: '32.5 miles of heavy rail. Built rapidly and affordably in the 1990s.'
	},
	{
		project: 'Metro (2003–2007 expansion)',
		city: 'Madrid',
		costPerMile: 0.11, // €4.4B (~$6B) / 56mi (was incorrectly $0.3B/mi)
		year: 2007,
		notes: '56 miles of new metro in under 4 years for ~€4.4B. A fraction of NYC costs.'
	}
];

// Existing line report cards [mta-cbtc] [mta-ridership-2025]
export interface LineReportCard {
	name: string;
	routes: string;
	color: string;
	dailyRidership: number;
	lengthMiles: number;
	stations: number;
	peakHeadwayMin: number;
	hasCBTC: boolean;
	onTimePercent: number;
	sharesTrack: boolean;
	note: string;
}

export const lineReportCards: LineReportCard[] = [
	{
		name: 'Lexington Ave',
		routes: '4/5/6',
		color: '#00933C',
		dailyRidership: 1_300_000,
		lengthMiles: 26,
		stations: 38,
		peakHeadwayMin: 3,
		hasCBTC: false,
		onTimePercent: 72,
		sharesTrack: true,
		note: 'The workhorse. Carries more riders than most entire subway systems but runs on 1930s signal technology. Chronically overcrowded — SAS exists to relieve it.'
	},
	{
		name: 'Broadway–7th Ave',
		routes: '1/2/3',
		color: '#EE352E',
		dailyRidership: 900_000,
		lengthMiles: 34,
		stations: 62,
		peakHeadwayMin: 3,
		hasCBTC: false,
		onTimePercent: 74,
		sharesTrack: true,
		note: 'The West Side backbone. The 1 is local, the 2/3 are express. Long but reliable by NYC standards.'
	},
	{
		name: '8th Ave / Fulton',
		routes: 'A/C/E',
		color: '#2850AD',
		dailyRidership: 850_000,
		lengthMiles: 50,
		stations: 60,
		peakHeadwayMin: 4,
		hasCBTC: false,
		onTimePercent: 68,
		sharesTrack: true,
		note: 'The A is the longest line in the system. Three services sharing track means one delay cascades across all of them.'
	},
	{
		name: 'Broadway',
		routes: 'N/Q/R/W',
		color: '#FCCC0A',
		dailyRidership: 750_000,
		lengthMiles: 30,
		stations: 49,
		peakHeadwayMin: 4,
		hasCBTC: false,
		onTimePercent: 71,
		sharesTrack: true,
		note: 'Connects Astoria, Midtown, and deep Brooklyn. The Q got a boost from SAS Phase 1 opening.'
	},
	{
		name: '6th Ave',
		routes: 'B/D/F/M',
		color: '#FF6319',
		dailyRidership: 700_000,
		lengthMiles: 36,
		stations: 57,
		peakHeadwayMin: 5,
		hasCBTC: false,
		onTimePercent: 65,
		sharesTrack: true,
		note: 'The worst performer. Four services on shared track with the oldest signals. A bottleneck at DeKalb Ave causes system-wide pain.'
	},
	{
		name: 'Flushing',
		routes: '7',
		color: '#B933AD',
		dailyRidership: 400_000,
		lengthMiles: 10,
		stations: 22,
		peakHeadwayMin: 2.5,
		hasCBTC: true,
		onTimePercent: 91, // Updated: MTA reports ~91% with CBTC (was 82%)
		sharesTrack: false,
		note: 'One of two lines with modern CBTC signaling. Self-contained, no shared track. The "International Express" — serves some of the most diverse neighborhoods on Earth.'
	},
	{
		name: 'Canarsie',
		routes: 'L',
		color: '#A7A9AC',
		dailyRidership: 350_000,
		lengthMiles: 8,
		stations: 24,
		peakHeadwayMin: 2.5,
		hasCBTC: true,
		onTimePercent: 91, // Updated: MTA reports >90% with CBTC (was 85%)
		sharesTrack: false,
		note: 'The gold standard. First line fully converted to CBTC. Runs every 2–3 minutes at peak, no shared track, highest on-time performance in the system. Proof that modernization works.'
	},
	{
		name: 'Jamaica',
		routes: 'J/Z',
		color: '#996633',
		dailyRidership: 250_000,
		lengthMiles: 12,
		stations: 30,
		peakHeadwayMin: 5,
		hasCBTC: false,
		onTimePercent: 73,
		sharesTrack: false,
		note: 'Serves East New York, Bushwick, and the Williamsburg Bridge corridor. Lower ridership but vital for communities with few alternatives.'
	},
	{
		name: 'Crosstown',
		routes: 'G',
		color: '#6CBE45',
		dailyRidership: 130_000,
		lengthMiles: 8,
		stations: 19,
		peakHeadwayMin: 6,
		hasCBTC: false,
		onTimePercent: 76,
		sharesTrack: false,
		note: 'The only line that never touches Manhattan. Connects Brooklyn and Queens along a unique crosstown path. Underinvested — only runs 4-car trains despite growing demand.'
	}
];

export function getLineGrade(line: LineReportCard): string {
	// Composite score: on-time performance + CBTC bonus + headway efficiency - track sharing penalty
	let score = line.onTimePercent;
	if (line.hasCBTC) score += 10;
	if (!line.sharesTrack) score += 5;
	if (line.peakHeadwayMin <= 3) score += 5;
	if (line.peakHeadwayMin >= 6) score -= 3;
	score += line.dailyRidership / line.lengthMiles / 10000; // ridership density bonus

	if (score >= 95) return 'A+';
	if (score >= 90) return 'A';
	if (score >= 85) return 'A-';
	if (score >= 80) return 'B+';
	if (score >= 75) return 'B';
	if (score >= 72) return 'B-';
	if (score >= 68) return 'C+';
	if (score >= 64) return 'C';
	return 'C-';
}

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
