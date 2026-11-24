import { GeoCoordinates, HeritageRegionId, UserProfileInput } from '../types/genealogy';

export interface OriginPlace {
  city: string;
  country: string;
  coords: GeoCoordinates;
}

export interface HeritageCultureDataset {
  id: HeritageRegionId;
  label: string;
  sublabel: string;
  secondaryRegionId: HeritageRegionId;
  defaultModernPlace: OriginPlace;
  ancestralPlaces: OriginPlace[];
  maleFirstNames: string[];
  femaleFirstNames: string[];
  surnames: string[];
  occupationsByEra: {
    modern: string[];    // 1950+
    industrial: string[]; // 1890–1949
    historic: string[];   // pre-1890
  };
  recordSources: {
    modern: string[];
    industrial: string[];
    historic: string[];
  };
  migrationNarrative: string;
}

export const HERITAGE_DATASETS: Record<HeritageRegionId, HeritageCultureDataset> = {
  british_isles: {
    id: 'british_isles',
    label: 'British & Scottish Isles',
    sublabel: 'Highland parishes, Lowland burghs & maritime ports',
    secondaryRegionId: 'nordic',
    defaultModernPlace: { city: 'Edinburgh', country: 'Scotland', coords: { lat: 55.95, lon: -3.19 } },
    ancestralPlaces: [
      { city: 'Edinburgh', country: 'Scotland', coords: { lat: 55.95, lon: -3.19 } },
      { city: 'Inverness', country: 'Scotland', coords: { lat: 57.48, lon: -4.22 } },
      { city: 'Galway', country: 'Ireland', coords: { lat: 53.27, lon: -9.05 } },
      { city: 'York', country: 'England', coords: { lat: 53.96, lon: -1.08 } },
      { city: 'Aberdeen', country: 'Scotland', coords: { lat: 57.15, lon: -2.09 } },
      { city: 'Bristol', country: 'England', coords: { lat: 51.45, lon: -2.59 } },
    ],
    maleFirstNames: ['Alistair', 'Malcolm', 'Arthur', 'Duncan', 'Hamish', 'Edward', 'Callum', 'Fergus', 'Gavin', 'Thomas'],
    femaleFirstNames: ['Fiona', 'Eleanor', 'Margaret', 'Isobel', 'Beatrice', 'Catriona', 'Agnes', 'Clara', 'Morag', 'Evelyn'],
    surnames: ['MacLeod', 'Campbell', 'Fraser', 'Henderson', 'Murray', 'Sinclair', 'Stewart', 'Galloway', 'Baird', 'Kerr'],
    occupationsByEra: {
      modern: ['Civil Engineer', 'University Archivist', 'Marine Biologist', 'Architectural Historian', 'Physician'],
      industrial: ['Shipwright', 'Railway Surveyor', 'Woolen Mill Steward', 'Schoolmistress', 'Master Stonemason'],
      historic: ['Highland Crofter', 'Parish Clerk', 'Harbor Pilot', 'Linen Weaver', 'Blacksmith'],
    },
    recordSources: {
      modern: ['General Register Office Civil Index', 'National Electoral Roll', 'University Matriculation Ledger'],
      industrial: ['1911 Scotland Parish Census', 'Port of Leith Maritime Registry', 'Ordnance Survey Guild Record'],
      historic: ['Old Parish Baptismal Register', 'Highland Hearth Tax Roll', 'Church Session Minutes'],
    },
    migrationNarrative: 'Traces rural parish roots across the Scottish Highlands and western coasts into industrial port cities.',
  },
  mediterranean: {
    id: 'mediterranean',
    label: 'Mediterranean & Italian',
    sublabel: 'Tuscan hill towns, coastal ports & guild communes',
    secondaryRegionId: 'iberian',
    defaultModernPlace: { city: 'Florence', country: 'Italy', coords: { lat: 43.77, lon: 11.25 } },
    ancestralPlaces: [
      { city: 'Florence', country: 'Italy', coords: { lat: 43.77, lon: 11.25 } },
      { city: 'Siena', country: 'Italy', coords: { lat: 43.32, lon: 11.33 } },
      { city: 'Naples', country: 'Italy', coords: { lat: 40.85, lon: 14.27 } },
      { city: 'Palermo', country: 'Italy', coords: { lat: 38.12, lon: 13.36 } },
      { city: 'Genoa', country: 'Italy', coords: { lat: 44.41, lon: 8.93 } },
      { city: 'Thessaloniki', country: 'Greece', coords: { lat: 40.64, lon: 22.94 } },
    ],
    maleFirstNames: ['Lorenzo', 'Matteo', 'Giulio', 'Antonio', 'Federico', 'Pietro', 'Vincenzo', 'Ettore', 'Dante', 'Niccolo'],
    femaleFirstNames: ['Chiara', 'Beatrice', 'Elena', 'Sofia', 'Lucia', 'Caterina', 'Ginevra', 'Rosa', 'Valeria', 'Livia'],
    surnames: ['Conti', 'Bellini', 'Marchetti', 'Ferraro', 'Lombardi', 'Moretti', 'Rinaldi', 'De Luca', 'Galli', 'Sartori'],
    occupationsByEra: {
      modern: ['Restorer of Antiquities', 'Structural Architect', 'Agronomist', 'Botanical Illustrator', 'Pediatrician'],
      industrial: ['Master Typographer', 'Olive Oil Merchant', 'Railroad Draftsman', 'Silk Weaver', 'Violin Luthier'],
      historic: ['Stone Carver', 'Vineyard Steward', 'Port Cartographer', 'Notary Public', 'Apothecary'],
    },
    recordSources: {
      modern: ['Anagrafe Comunale Civil Registry', 'Regional Chamber Archive', 'Civic University Roll'],
      industrial: ['Stato Civile di Firenze', 'Maritime Passenger Manifest', 'Provincial Guild Census'],
      historic: ['Archivio Parrocchiale Baptismal Book', 'Catasto Land Survey', 'Notarial Dowry Ledger'],
    },
    migrationNarrative: 'Follows agrarian hill communes and Mediterranean port guilds converging toward modern cultural capitals.',
  },
  iberian: {
    id: 'iberian',
    label: 'Iberian & Latin American',
    sublabel: 'Andalusian municipalities & transatlantic crossings',
    secondaryRegionId: 'mediterranean',
    defaultModernPlace: { city: 'Seville', country: 'Spain', coords: { lat: 37.39, lon: -5.98 } },
    ancestralPlaces: [
      { city: 'Seville', country: 'Spain', coords: { lat: 37.39, lon: -5.98 } },
      { city: 'Cordoba', country: 'Spain', coords: { lat: 37.88, lon: -4.78 } },
      { city: 'Lisbon', country: 'Portugal', coords: { lat: 38.72, lon: -9.14 } },
      { city: 'Mexico City', country: 'Mexico', coords: { lat: 19.43, lon: -99.13 } },
      { city: 'Buenos Aires', country: 'Argentina', coords: { lat: -34.60, lon: -58.38 } },
      { city: 'Cadiz', country: 'Spain', coords: { lat: 36.53, lon: -6.29 } },
    ],
    maleFirstNames: ['Mateo', 'Alejandro', 'Rafael', 'Santiago', 'Joaquin', 'Esteban', 'Diego', 'Ignacio', 'Tomas', 'Alonso'],
    femaleFirstNames: ['Carmen', 'Isabel', 'Lucia', 'Marisol', 'Valeria', 'Soledad', 'Ines', 'Beatriz', 'Teresa', 'Paloma'],
    surnames: ['Morales', 'Castillo', 'Herrera', 'Navarro', 'Delgado', 'Mendoza', 'Vargas', 'Ortega', 'Aguilar', 'Salazar'],
    occupationsByEra: {
      modern: ['Urban Planner', 'Literature Professor', 'Hydrologist', 'Cardiologist', 'Museum Curator'],
      industrial: ['Ceramicist', 'Telegraph Operator', 'Citrus Exporter', 'Printing Press Foreman', 'Music Conservator'],
      historic: ['Master Silversmith', 'Archival Scribe', 'Navigator', 'Olive Grove Steward', 'Saddler'],
    },
    recordSources: {
      modern: ['Registro Civil Municipal', 'Ibero-American Academic Directory', 'Civic Population Index'],
      industrial: ['Archivo General de Indias Index', 'Cadiz Harbor Emigration Roll', 'Municipal Padron Census'],
      historic: ['Libro de Bautismos Parroquial', 'Notarial Protocol Archive', 'Royal Land Registry'],
    },
    migrationNarrative: 'Connects Andalusian and Lusitanian municipal parishes across historic transatlantic maritime routes.',
  },
  east_asian: {
    id: 'east_asian',
    label: 'East Asian Heritage',
    sublabel: 'Kyoto craft wards, port prefectures & family koseki',
    secondaryRegionId: 'north_american',
    defaultModernPlace: { city: 'Kyoto', country: 'Japan', coords: { lat: 35.01, lon: 135.77 } },
    ancestralPlaces: [
      { city: 'Kyoto', country: 'Japan', coords: { lat: 35.01, lon: 135.77 } },
      { city: 'Kanazawa', country: 'Japan', coords: { lat: 36.56, lon: 136.66 } },
      { city: 'Nagasaki', country: 'Japan', coords: { lat: 32.75, lon: 129.88 } },
      { city: 'Osaka', country: 'Japan', coords: { lat: 34.69, lon: 135.50 } },
      { city: 'Busan', country: 'South Korea', coords: { lat: 35.18, lon: 129.08 } },
      { city: 'Taipei', country: 'Taiwan', coords: { lat: 25.03, lon: 121.57 } },
    ],
    maleFirstNames: ['Kenji', 'Haruto', 'Takashi', 'Noboru', 'Minoru', 'Daichi', 'Shigeru', 'Tadashi', 'Kazuo', 'Hideo'],
    femaleFirstNames: ['Haruka', 'Fumiko', 'Yoko', 'Aiko', 'Sakura', 'Chiyoko', 'Naomi', 'Keiko', 'Mitsuko', 'Emi'],
    surnames: ['Takahashi', 'Watanabe', 'Kobayashi', 'Nakamura', 'Yoshida', 'Fujimoto', 'Hasegawa', 'Matsuda', 'Sato', 'Kuroda'],
    occupationsByEra: {
      modern: ['Acoustic Engineer', 'Botanical Researcher', 'Industrial Designer', 'Clinical Pharmacist', 'Art Conservator'],
      industrial: ['Silk Loom Master', 'Railroad Stationmaster', 'Lacquerware Artisan', 'Calligraphy Teacher', 'Tea Merchant'],
      historic: ['Timber Joiner', 'Kiln Potter', 'Village Magistrate', 'Paper Maker', 'Herbalist'],
    },
    recordSources: {
      modern: ['Municipal Koseki Registry', 'Prefectural Alumni Archive', 'National Civic Census'],
      industrial: ['Meiji Era Koseki Transcript', 'Guild Artisan Registry', 'Port Customs Ledger'],
      historic: ['Temple Shumon Aratamecho Roll', 'Domain Household Register', 'Merchant Guild Scroll'],
    },
    migrationNarrative: 'Preserves unbroken generational continuity through temple household registers and craft ward lineages.',
  },
  west_african: {
    id: 'west_african',
    label: 'West African & Diaspora',
    sublabel: 'Yoruba town compounds, coastal trade centers & diaspora',
    secondaryRegionId: 'north_american',
    defaultModernPlace: { city: 'Lagos', country: 'Nigeria', coords: { lat: 6.52, lon: 3.38 } },
    ancestralPlaces: [
      { city: 'Lagos', country: 'Nigeria', coords: { lat: 6.52, lon: 3.38 } },
      { city: 'Ibadan', country: 'Nigeria', coords: { lat: 7.38, lon: 3.95 } },
      { city: 'Ile-Ife', country: 'Nigeria', coords: { lat: 7.49, lon: 4.56 } },
      { city: 'Accra', country: 'Ghana', coords: { lat: 5.60, lon: -0.19 } },
      { city: 'Abeokuta', country: 'Nigeria', coords: { lat: 7.15, lon: 3.35 } },
      { city: 'Freetown', country: 'Sierra Leone', coords: { lat: 8.46, lon: -13.23 } },
    ],
    maleFirstNames: ['Adebayo', 'Oluwaseun', 'Babatunde', 'Chidi', 'Kwame', 'Tunde', 'Olumide', 'Folabi', 'Kofi', 'Seyi'],
    femaleFirstNames: ['Adunni', 'Titilayo', 'Yetunde', 'Amara', 'Ngozi', 'Folake', 'Abosede', 'Damilola', 'Efua', 'Morenike'],
    surnames: ['Adeyemi', 'Okafor', 'Balogun', 'Olawale', 'Mensah', 'Afolabi', 'Bamidele', 'Coker', 'Akinola', 'Nwosu'],
    occupationsByEra: {
      modern: ['Public Health Director', 'Geotechnical Engineer', 'Constitutional Barrister', 'Economist', 'Architect'],
      industrial: ['Cocoa Cooperative Clerk', 'Headmaster', 'Master Adire Dyer', 'Railway Telegrapher', 'Print Publisher'],
      historic: ['Bronze Caster', 'Oral Historian', 'Kola Trade Steward', 'Indigo Textile Weaver', 'Herbal Physician'],
    },
    recordSources: {
      modern: ['National Civil Birth Registry', 'University Alumni Roll', 'Municipal Land Archive'],
      industrial: ['Colonial District Gazette', 'Mission School Ledger', 'Coastal Merchant Almanac'],
      historic: ['Compound Oriki Lineage Chronicle', 'Town Council Oral Ledger', 'West Coast Parish Register'],
    },
    migrationNarrative: 'Weaves ancestral compound lineages and oral praise chronicles with coastal scholarly and civic hubs.',
  },
  central_european: {
    id: 'central_european',
    label: 'Central European & Germanic',
    sublabel: 'Bavarian market towns, Rhine valleys & guild cities',
    secondaryRegionId: 'british_isles',
    defaultModernPlace: { city: 'Munich', country: 'Germany', coords: { lat: 48.14, lon: 11.58 } },
    ancestralPlaces: [
      { city: 'Munich', country: 'Germany', coords: { lat: 48.14, lon: 11.58 } },
      { city: 'Augsburg', country: 'Germany', coords: { lat: 48.37, lon: 10.90 } },
      { city: 'Vienna', country: 'Austria', coords: { lat: 48.21, lon: 16.37 } },
      { city: 'Prague', country: 'Czechia', coords: { lat: 50.08, lon: 14.44 } },
      { city: 'Zurich', country: 'Switzerland', coords: { lat: 47.37, lon: 8.54 } },
      { city: 'Strasbourg', country: 'France', coords: { lat: 48.57, lon: 7.75 } },
    ],
    maleFirstNames: ['Lukas', 'Heinrich', 'Friedrich', 'Sebastian', 'Johann', 'Wilhelm', 'Tobias', 'Konrad', 'Martin', 'Otto'],
    femaleFirstNames: ['Anneliese', 'Clara', 'Margarete', 'Johanna', 'Helena', 'Elisabeth', 'Sabine', 'Katharina', 'Frieda', 'Greta'],
    surnames: ['Weber', 'Hoffmann', 'Richter', 'Becker', 'Schulz', 'Vogel', 'Hartmann', 'Bauer', 'Keller', 'Zimmermann'],
    occupationsByEra: {
      modern: ['Optical Physicist', 'Orchestral Cellist', 'Environmental Chemist', 'Publishing Editor', 'Surgeon'],
      industrial: ['Precision Watchmaker', 'Bookbinder', 'Locomotive Engineer', 'Botanical Conservator', 'Glassblower'],
      historic: ['Master Cabinetmaker', 'Forestry Warden', 'Millwright', 'Town Chronicler', 'Copper Engraver'],
    },
    recordSources: {
      modern: ['Standesamt Civil Registry', 'Federal Census Index', 'Polytechnic Alumni Ledger'],
      industrial: ['Bavarian Standesamt Book', 'Hamburg Passenger Departure List', 'Guild Master Certificate'],
      historic: ['Kirchenbuch Parish Register', 'Imperial Tax & Land Roll', 'Municipal Burgerbuch'],
    },
    migrationNarrative: 'Traces Alpine and Danube artisan guilds across Central European market towns and civic centers.',
  },
  nordic: {
    id: 'nordic',
    label: 'Nordic & Scandinavian',
    sublabel: 'Fjord parishes, Baltic ports & northern farmsteads',
    secondaryRegionId: 'british_isles',
    defaultModernPlace: { city: 'Oslo', country: 'Norway', coords: { lat: 59.91, lon: 10.75 } },
    ancestralPlaces: [
      { city: 'Oslo', country: 'Norway', coords: { lat: 59.91, lon: 10.75 } },
      { city: 'Bergen', country: 'Norway', coords: { lat: 60.39, lon: 5.32 } },
      { city: 'Gothenburg', country: 'Sweden', coords: { lat: 57.71, lon: 11.97 } },
      { city: 'Uppsala', country: 'Sweden', coords: { lat: 59.86, lon: 17.64 } },
      { city: 'Copenhagen', country: 'Denmark', coords: { lat: 55.68, lon: 12.57 } },
      { city: 'Reykjavik', country: 'Iceland', coords: { lat: 64.15, lon: -21.94 } },
    ],
    maleFirstNames: ['Henrik', 'Soren', 'Anders', 'Mikkel', 'Lars', 'Niels', 'Oskar', 'Torben', 'Magnus', 'Leif'],
    femaleFirstNames: ['Astrid', 'Freja', 'Ingrid', 'Signe', 'Linnea', 'Solveig', 'Maren', 'Birgitta', 'Kirsten', 'Elin'],
    surnames: ['Lindqvist', 'Solberg', 'Bergstrom', 'Holm', 'Nystrom', 'Halvorsen', 'Dahl', 'Eriksen', 'Sorensen', 'Lund'],
    occupationsByEra: {
      modern: ['Glaciologist', 'Naval Architect', 'Pediatric Nurse', 'Urban Mobility Planner', 'Biochemist'],
      industrial: ['Merchant Sea Captain', 'Lighthouse Keeper', 'Timber Surveyor', 'Schoolteacher', 'Boatbuilder'],
      historic: ['Fjord Fisherman', 'Parish Cantor', 'Silver Filigree Smith', 'Homestead Farmer', 'Mapmaker'],
    },
    recordSources: {
      modern: ['Folkeregisteret National Roll', 'Nordic Civic Population Index', 'University Registry'],
      industrial: ['1910 Norwegian National Census', 'Gothenburg Emigration Ledger', 'Maritime Seaman Roll'],
      historic: ['Kirkebok Ministerial Register', 'Husforhorslangd Household Book', 'Farmstead Probate Roll'],
    },
    migrationNarrative: 'Follows coastal seafaring and fjord farmstead ministerial books into modern Nordic port capitals.',
  },
  north_american: {
    id: 'north_american',
    label: 'North American & Pioneer',
    sublabel: 'Atlantic ports, overland trails & crossroads cities',
    secondaryRegionId: 'british_isles',
    defaultModernPlace: { city: 'Boston', country: 'USA', coords: { lat: 42.36, lon: -71.06 } },
    ancestralPlaces: [
      { city: 'Boston', country: 'USA', coords: { lat: 42.36, lon: -71.06 } },
      { city: 'Philadelphia', country: 'USA', coords: { lat: 39.95, lon: -75.17 } },
      { city: 'Montreal', country: 'Canada', coords: { lat: 45.50, lon: -73.57 } },
      { city: 'Chicago', country: 'USA', coords: { lat: 41.88, lon: -87.63 } },
      { city: 'Charleston', country: 'USA', coords: { lat: 32.78, lon: -79.93 } },
      { city: 'San Francisco', country: 'USA', coords: { lat: 37.77, lon: -122.42 } },
    ],
    maleFirstNames: ['Benjamin', 'Samuel', 'Nathaniel', 'Caleb', 'Julian', 'Arthur', 'Henry', 'Owen', 'Theodore', 'Elias'],
    femaleFirstNames: ['Clara', 'Abigail', 'Evelyn', 'Miriam', 'Hannah', 'Charlotte', 'Nora', 'Lydia', 'Grace', 'Audrey'],
    surnames: ['Vance', 'Whitaker', 'Mercer', 'Callahan', 'Prescott', 'Alden', 'Bennett', 'Holloway', 'Sterling', 'Donovan'],
    occupationsByEra: {
      modern: ['Software Architect', 'Civic Historian', 'Atmospheric Scientist', 'Pediatrician', 'Editorial Director'],
      industrial: ['Cartographer', 'Newspaper Compositor', 'Bridge Drafter', 'Botanical Librarian', 'Telegraph Supervisor'],
      historic: ['Clipper Shipwright', 'Town Surveyor', 'Quaker Schoolmaster', 'Clockmaker', 'Homestead Miller'],
    },
    recordSources: {
      modern: ['State Vital Statistics Registry', 'Municipal Archive Index', 'National Social Security Index'],
      industrial: ['1920 Federal Population Census', 'Ellis Island Arrival Manifest', 'City Directory Archive'],
      historic: ['1860 Federal Census Schedule', 'County Probate & Deed Book', 'Town Meeting Vital Ledger'],
    },
    migrationNarrative: 'Maps Atlantic harbor arrivals and continental crossroads into multi-generational civic archives.',
  },
};

export interface SampleProfilePreset {
  label: string;
  caption: string;
  profile: UserProfileInput;
}

export const SAMPLE_PROFILES: SampleProfilePreset[] = [
  {
    label: 'Clara Vance',
    caption: 'b. 1994 · Edinburgh · British & Nordic lines',
    profile: {
      fullName: 'Clara Vance',
      dob: '1994-05-18',
      age: 32,
      birthplace: 'Edinburgh, Scotland',
      regionId: 'british_isles',
      fatherName: 'Arthur Vance',
      motherName: 'Fiona MacLeod',
      siblingsCount: 2,
      includeExtendedCousins: true,
    },
  },
  {
    label: 'Kenji Takahashi',
    caption: 'b. 1989 · Kyoto · 5-generation Koseki lineage',
    profile: {
      fullName: 'Kenji Takahashi',
      dob: '1989-10-03',
      age: 37,
      birthplace: 'Kyoto, Japan',
      regionId: 'east_asian',
      fatherName: 'Takashi Takahashi',
      motherName: 'Haruka Watanabe',
      siblingsCount: 1,
      includeExtendedCousins: true,
    },
  },
  {
    label: 'Mateo Morales',
    caption: 'b. 1998 · Seville · Iberian & Mediterranean lines',
    profile: {
      fullName: 'Mateo Morales',
      dob: '1998-02-14',
      age: 28,
      birthplace: 'Seville, Spain',
      regionId: 'iberian',
      fatherName: 'Rafael Morales',
      motherName: 'Carmen Navarro',
      siblingsCount: 2,
      includeExtendedCousins: true,
    },
  },
];
