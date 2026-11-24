export type LineageBranch = 'self' | 'paternal' | 'maternal' | 'extended';

export type HeritageRegionId =
  | 'british_isles'
  | 'mediterranean'
  | 'iberian'
  | 'east_asian'
  | 'west_african'
  | 'central_european'
  | 'nordic'
  | 'north_american';

export interface GeoCoordinates {
  lat: number;
  lon: number;
}

export interface PersonNode {
  id: string;
  ahnentafel: number | null;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: 'female' | 'male' | 'other';
  generation: number; // 0 = Self/Siblings/Cousins, 1 = Parents/Aunts/Uncles, 2..5 = Ancestors, -1 = Children
  branch: LineageBranch;
  relationshipLabel: string;
  birthDate: string; // YYYY-MM-DD or YYYY
  birthYear: number;
  deathYear: number | null;
  isLiving: boolean;
  birthplace: string;
  originRegion: string;
  coordinates: GeoCoordinates;
  occupation: string;
  archivalCitation: string;
  bioNote: string;
  parentIds: string[];
  spouseIds: string[];
  childrenIds: string[];
}

export interface UserProfileInput {
  fullName: string;
  dob: string; // YYYY-MM-DD
  age: number;
  birthplace: string;
  regionId: HeritageRegionId;
  fatherName: string;
  motherName: string;
  siblingsCount: number;
  includeExtendedCousins: boolean;
}

export interface FamilyTreeData {
  profile: UserProfileInput;
  rootId: string;
  nodes: Record<string, PersonNode>;
  createdAt: string;
  lineageSummary: string;
}

export interface LineagePathStep {
  node: PersonNode;
  relationFromPrev: string;
}

export interface LineagePathResult {
  targetId: string;
  steps: LineagePathStep[];
  generationDistance: number;
  estimatedSharedLineagePct: number;
  description: string;
}

export type VisualizationMode = 'pedigree' | 'fan' | 'timeline' | 'kinship';

export type TreeBranchFilter = 'all' | 'direct' | 'paternal' | 'maternal' | 'extended';

export interface RelationshipAnalysis {
  personA: PersonNode;
  personB: PersonNode;
  relationshipTitle: string;
  explanation: string;
  commonAncestors: PersonNode[];
  stepsUpFromA: number;
  stepsUpFromB: number;
  shortestPath: LineagePathStep[];
  wrightCoefficientPct: number;
  ahnentafelChainB: number[];
}

export interface SurnameMatchCandidate {
  id: string;
  fullName: string;
  birthYear: number;
  deathYear: number | null;
  birthplace: string;
  occupation: string;
  archiveSource: string;
  matchScore: number;
  matchBasis: string;
  suggestedAnchorId: string;
  suggestedRelation: 'parent' | 'sibling';
}

export interface TreeGraphMetrics {
  totalNodes: number;
  totalLinks: number;
  avgGenerationGap: number;
  avgDocumentedLifespan: number;
  earliestYear: number;
  paternalCount: number;
  maternalCount: number;
}

export interface NewRelativeInput {
  anchorId: string;
  relationType: 'parent' | 'sibling' | 'child' | 'spouse';
  firstName: string;
  lastName: string;
  gender: 'female' | 'male' | 'other';
  birthYear: number;
  deathYear: number | null;
  birthplace: string;
  occupation: string;
  bioNote: string;
}

export interface GroundingWebSource {
  title: string;
  uri: string;
}

export interface GroundedResearchResult {
  summary: string;
  sources: GroundingWebSource[];
}
