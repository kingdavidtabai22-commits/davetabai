import { HERITAGE_DATASETS, HeritageCultureDataset, OriginPlace } from '../data/heritageArchive';
import {
  FamilyTreeData,
  LineageBranch,
  LineagePathResult,
  LineagePathStep,
  PersonNode,
  RelationshipAnalysis,
  SurnameMatchCandidate,
  TreeGraphMetrics,
  UserProfileInput,
} from '../types/genealogy';

// Reference date matching runtime environment (2026-11-24)
const REFERENCE_YEAR = 2026;
const REFERENCE_MONTH = 11;
const REFERENCE_DAY = 24;

export function calculateAgeFromDob(dob: string): number {
  if (!dob) return 30;
  const parts = dob.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return 30;
  const [y, m, d] = parts;
  let age = REFERENCE_YEAR - y;
  if (m > REFERENCE_MONTH || (m === REFERENCE_MONTH && d > REFERENCE_DAY)) {
    age -= 1;
  }
  return Math.max(0, Math.min(120, age));
}

export function deriveDobFromAge(age: number, currentDob?: string): string {
  const clampedAge = Math.max(0, Math.min(120, Math.round(age || 0)));
  const birthYear = REFERENCE_YEAR - clampedAge;
  const monthPart = currentDob && /^\d{4}-\d{2}-\d{2}$/.test(currentDob) ? currentDob.slice(5, 7) : '06';
  const dayPart = currentDob && /^\d{4}-\d{2}-\d{2}$/.test(currentDob) ? currentDob.slice(8, 10) : '15';
  const m = parseInt(monthPart, 10);
  const d = parseInt(dayPart, 10);
  const adjustedYear =
    m > REFERENCE_MONTH || (m === REFERENCE_MONTH && d > REFERENCE_DAY) ? birthYear - 1 : birthYear;
  return `${adjustedYear}-${monthPart}-${dayPart}`;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function pickFrom<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length];
}

function splitName(fullName: string, fallbackFirst: string, fallbackLast: string): { first: string; last: string } {
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { first: fallbackFirst, last: fallbackLast };
  const parts = cleaned.split(' ');
  if (parts.length === 1) return { first: parts[0], last: fallbackLast };
  return {
    first: parts.slice(0, -1).join(' '),
    last: parts[parts.length - 1],
  };
}

function formatGenerationRelationship(ahnentafel: number): string {
  switch (ahnentafel) {
    case 1:
      return 'You (Root)';
    case 2:
      return 'Father';
    case 3:
      return 'Mother';
    case 4:
      return 'Paternal Grandfather';
    case 5:
      return 'Paternal Grandmother';
    case 6:
      return 'Maternal Grandfather';
    case 7:
      return 'Maternal Grandmother';
    default: {
      const gen = Math.floor(Math.log2(ahnentafel));
      const side = ahnentafel < Math.pow(2, gen) + Math.pow(2, gen - 1) ? 'Paternal' : 'Maternal';
      const role = ahnentafel % 2 === 0 ? 'Grandfather' : 'Grandmother';
      if (gen === 3) return `${side} Great-${role}`;
      if (gen === 4) return `${side} 2nd Great-${role}`;
      if (gen === 5) return `${side} 3rd Great-${role}`;
      return `${side} Ancestor (Gen +${gen})`;
    }
  }
}

function selectOccupation(dataset: HeritageCultureDataset, birthYear: number, seed: number): string {
  if (birthYear >= 1950) return pickFrom(dataset.occupationsByEra.modern, seed, 3);
  if (birthYear >= 1890) return pickFrom(dataset.occupationsByEra.industrial, seed, 7);
  return pickFrom(dataset.occupationsByEra.historic, seed, 11);
}

function selectCitation(dataset: HeritageCultureDataset, birthYear: number, place: OriginPlace, seed: number): string {
  const pool =
    birthYear >= 1950
      ? dataset.recordSources.modern
      : birthYear >= 1890
      ? dataset.recordSources.industrial
      : dataset.recordSources.historic;
  const source = pickFrom(pool, seed, 5);
  return `${source} · ${place.city}, ${place.country} (${birthYear + 2})`;
}

function computeDeathYear(birthYear: number, seed: number): number | null {
  const expectedAge = 68 + (seed % 23); // 68 to 90 years
  const deathYear = birthYear + expectedAge;
  if (deathYear >= REFERENCE_YEAR) {
    // Still living if younger than ~94
    if (REFERENCE_YEAR - birthYear <= 93 && seed % 5 !== 0) {
      return null;
    }
    return REFERENCE_YEAR - 2 - (seed % 5);
  }
  return deathYear;
}

export function generateExtendedFamilyTree(profile: UserProfileInput): FamilyTreeData {
  const primaryDataset = HERITAGE_DATASETS[profile.regionId];
  const secondaryDataset = HERITAGE_DATASETS[primaryDataset.secondaryRegionId];

  const userBirthYear =
    profile.dob && /^\d{4}/.test(profile.dob)
      ? parseInt(profile.dob.slice(0, 4), 10)
      : REFERENCE_YEAR - (profile.age || 30);

  const parsedSelf = splitName(profile.fullName, 'Alex', primaryDataset.surnames[0]);
  const baseSeed = hashString(`${parsedSelf.first}|${parsedSelf.last}|${profile.dob}|${profile.regionId}`);

  const fatherParsed = profile.fatherName.trim()
    ? splitName(profile.fatherName, pickFrom(primaryDataset.maleFirstNames, baseSeed, 1), parsedSelf.last)
    : {
        first: pickFrom(primaryDataset.maleFirstNames, baseSeed, 1),
        last: parsedSelf.last,
      };

  const motherDefaultSurname = pickFrom(secondaryDataset.surnames, baseSeed, 4);
  const motherParsed = profile.motherName.trim()
    ? splitName(profile.motherName, pickFrom(secondaryDataset.femaleFirstNames, baseSeed, 2), motherDefaultSurname)
    : {
        first: pickFrom(secondaryDataset.femaleFirstNames, baseSeed, 2),
        last: motherDefaultSurname,
      };

  const nodes: Record<string, PersonNode> = {};

  const selfPlace: OriginPlace = profile.birthplace.trim()
    ? {
        city: profile.birthplace.split(',')[0].trim(),
        country: profile.birthplace.split(',')[1]?.trim() || primaryDataset.defaultModernPlace.country,
        coords: primaryDataset.defaultModernPlace.coords,
      }
    : primaryDataset.defaultModernPlace;

  // Root node (Ahnentafel = 1)
  const rootId = 'ahn-1';
  nodes[rootId] = {
    id: rootId,
    ahnentafel: 1,
    firstName: parsedSelf.first,
    lastName: parsedSelf.last,
    gender: 'other',
    generation: 0,
    branch: 'self',
    relationshipLabel: 'You (Root)',
    birthDate: profile.dob || `${userBirthYear}-06-15`,
    birthYear: userBirthYear,
    deathYear: null,
    isLiving: true,
    birthplace: `${selfPlace.city}, ${selfPlace.country}`,
    originRegion: primaryDataset.label,
    coordinates: selfPlace.coords,
    occupation: 'Lineage Researcher',
    archivalCitation: `Personal Intake Record · ${selfPlace.city} (${REFERENCE_YEAR})`,
    bioNote: `Focal individual anchoring this multi-generational lineage archive spanning ${primaryDataset.label} and ${secondaryDataset.label} heritage lines.`,
    parentIds: ['ahn-2', 'ahn-3'],
    spouseIds: [],
    childrenIds: [],
  };

  // Build Direct Ancestors up to Generation 4 (2nd Great-Grandparents = ahnentafel 2..31 -> 30 direct ancestors)
  // Plus 2 iconic 3rd Great-Grandparent founders at Gen 5 (ahn-32, ahn-33) so paternal root reaches 5 generations back!
  const maxAhn = 31;
  const ahnBirthYears: Record<number, number> = { 1: userBirthYear };
  const ahnSurnames: Record<number, string> = {
    1: parsedSelf.last,
    2: fatherParsed.last,
    3: motherParsed.last,
  };

  for (let ahn = 2; ahn <= maxAhn; ahn++) {
    const gen = Math.floor(Math.log2(ahn));
    const childAhn = Math.floor(ahn / 2);
    const isMale = ahn % 2 === 0;
    const isPaternalBranch = ahn < Math.pow(2, gen) + Math.pow(2, gen - 1);
    const branch: LineageBranch = isPaternalBranch ? 'paternal' : 'maternal';

    // Blend primary & secondary cultural datasets across branches
    const useSecondary = !isPaternalBranch && gen >= 1;
    const dataset = useSecondary ? secondaryDataset : primaryDataset;
    const nodeSeed = hashString(`${baseSeed}-${ahn}-${dataset.id}`);

    // Compute plausible parent birth year (25-33 years earlier than child)
    const gap = (isMale ? 28 : 25) + (nodeSeed % 6);
    const birthYear = ahnBirthYears[childAhn] - gap;
    ahnBirthYears[ahn] = birthYear;

    // Surname inheritance: males pass down surname to child; females carry unique maiden surname
    let lastName = '';
    if (ahn === 2) lastName = fatherParsed.last;
    else if (ahn === 3) lastName = motherParsed.last;
    else if (isMale) {
      lastName = ahnSurnames[childAhn] || pickFrom(dataset.surnames, nodeSeed, ahn);
    } else {
      lastName = pickFrom(dataset.surnames, nodeSeed, ahn * 3 + 7);
    }
    ahnSurnames[ahn] = lastName;

    let firstName = '';
    if (ahn === 2) firstName = fatherParsed.first;
    else if (ahn === 3) firstName = motherParsed.first;
    else {
      firstName = isMale
        ? pickFrom(dataset.maleFirstNames, nodeSeed, ahn)
        : pickFrom(dataset.femaleFirstNames, nodeSeed, ahn);
    }

    // Place shifts gradually back toward historical ancestral towns in deeper generations
    const placeIdx = Math.min(dataset.ancestralPlaces.length - 1, Math.floor((gen + (nodeSeed % 2)) / 1.1));
    const place = gen === 1 && isPaternalBranch ? selfPlace : dataset.ancestralPlaces[placeIdx];
    const deathYear = computeDeathYear(birthYear, nodeSeed);
    const month = String(1 + (nodeSeed % 12)).padStart(2, '0');
    const day = String(1 + ((nodeSeed * 7) % 28)).padStart(2, '0');

    const parentIds: string[] = [];
    if (ahn * 2 <= maxAhn) {
      parentIds.push(`ahn-${ahn * 2}`, `ahn-${ahn * 2 + 1}`);
    }

    const spouseAhn = isMale ? ahn + 1 : ahn - 1;
    const id = `ahn-${ahn}`;

    nodes[id] = {
      id,
      ahnentafel: ahn,
      firstName,
      lastName,
      maidenName: !isMale ? lastName : undefined,
      gender: isMale ? 'male' : 'female',
      generation: gen,
      branch,
      relationshipLabel: formatGenerationRelationship(ahn),
      birthDate: `${birthYear}-${month}-${day}`,
      birthYear,
      deathYear,
      isLiving: deathYear === null,
      birthplace: `${place.city}, ${place.country}`,
      originRegion: dataset.label,
      coordinates: place.coords,
      occupation: selectOccupation(dataset, birthYear, nodeSeed),
      archivalCitation: selectCitation(dataset, birthYear, place, nodeSeed),
      bioNote: `Recorded in ${place.city} during the ${Math.floor(birthYear / 10) * 10}s as a ${selectOccupation(
        dataset,
        birthYear,
        nodeSeed
      ).toLowerCase()}, continuing the ${branch} lineage.`,
      parentIds,
      spouseIds: [`ahn-${spouseAhn}`],
      childrenIds: [`ahn-${childAhn}`],
    };
  }

  // Add Generation 5 Root Founders on the direct paternal line (ahn-32 & ahn-33 -> parents of ahn-16)
  [32, 33].forEach((ahn) => {
    const isMale = ahn % 2 === 0;
    const nodeSeed = hashString(`${baseSeed}-${ahn}`);
    const birthYear = ahnBirthYears[16] - (isMale ? 29 : 26) - (nodeSeed % 5);
    const place = primaryDataset.ancestralPlaces[primaryDataset.ancestralPlaces.length - 1];
    const lastName = isMale ? ahnSurnames[16] : pickFrom(primaryDataset.surnames, nodeSeed, 19);
    const firstName = isMale
      ? pickFrom(primaryDataset.maleFirstNames, nodeSeed, 5)
      : pickFrom(primaryDataset.femaleFirstNames, nodeSeed, 8);
    const deathYear = birthYear + 67 + (nodeSeed % 18);
    const id = `ahn-${ahn}`;
    nodes['ahn-16'].parentIds.push(id);
    nodes[id] = {
      id,
      ahnentafel: ahn,
      firstName,
      lastName,
      maidenName: !isMale ? lastName : undefined,
      gender: isMale ? 'male' : 'female',
      generation: 5,
      branch: 'paternal',
      relationshipLabel: formatGenerationRelationship(ahn),
      birthDate: `${birthYear}-04-12`,
      birthYear,
      deathYear,
      isLiving: false,
      birthplace: `${place.city}, ${place.country}`,
      originRegion: primaryDataset.label,
      coordinates: place.coords,
      occupation: selectOccupation(primaryDataset, birthYear, nodeSeed),
      archivalCitation: selectCitation(primaryDataset, birthYear, place, nodeSeed),
      bioNote: `Earliest documented ${primaryDataset.label} root ancestor in this lineage archive.`,
      parentIds: [],
      spouseIds: [isMale ? 'ahn-33' : 'ahn-32'],
      childrenIds: ['ahn-16'],
    };
  });

  // Add Extended Family: Siblings (Generation 0)
  const siblingsCount = Math.max(0, Math.min(4, profile.siblingsCount ?? 1));
  for (let i = 0; i < siblingsCount; i++) {
    const sSeed = hashString(`${baseSeed}-sib-${i}`);
    const isMale = i % 2 === 0;
    const offsetYears = i === 0 ? -3 : i === 1 ? 3 : i === 2 ? -6 : 6;
    const sibBirthYear = Math.min(REFERENCE_YEAR - 1, userBirthYear + offsetYears);
    const sibId = `ext-sib-${i + 1}`;
    const firstName = isMale
      ? pickFrom(primaryDataset.maleFirstNames, sSeed, i + 4)
      : pickFrom(primaryDataset.femaleFirstNames, sSeed, i + 5);

    nodes[sibId] = {
      id: sibId,
      ahnentafel: null,
      firstName,
      lastName: parsedSelf.last,
      gender: isMale ? 'male' : 'female',
      generation: 0,
      branch: 'extended',
      relationshipLabel: isMale ? 'Brother' : 'Sister',
      birthDate: `${sibBirthYear}-08-${String(10 + i * 4).padStart(2, '0')}`,
      birthYear: sibBirthYear,
      deathYear: null,
      isLiving: true,
      birthplace: `${selfPlace.city}, ${selfPlace.country}`,
      originRegion: primaryDataset.label,
      coordinates: selfPlace.coords,
      occupation: selectOccupation(primaryDataset, sibBirthYear, sSeed),
      archivalCitation: `Civil Birth Index · ${selfPlace.city} (${sibBirthYear})`,
      bioNote: `Shares both ${fatherParsed.first} and ${motherParsed.first}'s generational heritage in ${selfPlace.city}.`,
      parentIds: ['ahn-2', 'ahn-3'],
      spouseIds: [],
      childrenIds: [],
    };
    nodes['ahn-2'].childrenIds.push(sibId);
    nodes['ahn-3'].childrenIds.push(sibId);
  }

  // Add Extended Family: Paternal Uncle & Maternal Aunt + First Cousins
  if (profile.includeExtendedCousins) {
    // Paternal Uncle (brother of Father ahn-2, child of ahn-4 & ahn-5)
    const uSeed = hashString(`${baseSeed}-pat-uncle`);
    const uncleBirth = nodes['ahn-2'].birthYear + 3;
    const uncleId = 'ext-uncle-pat';
    nodes[uncleId] = {
      id: uncleId,
      ahnentafel: null,
      firstName: pickFrom(primaryDataset.maleFirstNames, uSeed, 6),
      lastName: fatherParsed.last,
      gender: 'male',
      generation: 1,
      branch: 'paternal',
      relationshipLabel: 'Paternal Uncle',
      birthDate: `${uncleBirth}-03-19`,
      birthYear: uncleBirth,
      deathYear: computeDeathYear(uncleBirth, uSeed),
      isLiving: computeDeathYear(uncleBirth, uSeed) === null,
      birthplace: nodes['ahn-4'].birthplace,
      originRegion: primaryDataset.label,
      coordinates: nodes['ahn-4'].coordinates,
      occupation: selectOccupation(primaryDataset, uncleBirth, uSeed),
      archivalCitation: selectCitation(primaryDataset, uncleBirth, primaryDataset.ancestralPlaces[1], uSeed),
      bioNote: `Younger brother of ${fatherParsed.first}, extending the paternal ${fatherParsed.last} branch.`,
      parentIds: ['ahn-4', 'ahn-5'],
      spouseIds: [],
      childrenIds: ['ext-cousin-1'],
    };
    nodes['ahn-4'].childrenIds.push(uncleId);
    nodes['ahn-5'].childrenIds.push(uncleId);

    // First Cousin (Paternal side)
    const c1Seed = hashString(`${baseSeed}-cousin-1`);
    const c1Birth = userBirthYear + 2;
    nodes['ext-cousin-1'] = {
      id: 'ext-cousin-1',
      ahnentafel: null,
      firstName: pickFrom(primaryDataset.femaleFirstNames, c1Seed, 9),
      lastName: fatherParsed.last,
      gender: 'female',
      generation: 0,
      branch: 'extended',
      relationshipLabel: 'First Cousin (Paternal)',
      birthDate: `${c1Birth}-09-11`,
      birthYear: c1Birth,
      deathYear: null,
      isLiving: true,
      birthplace: nodes[uncleId].birthplace,
      originRegion: primaryDataset.label,
      coordinates: nodes[uncleId].coordinates,
      occupation: selectOccupation(primaryDataset, c1Birth, c1Seed),
      archivalCitation: `Civic Registry · ${nodes[uncleId].birthplace} (${c1Birth})`,
      bioNote: `Paternal first cousin connected through grandparents ${nodes['ahn-4'].firstName} and ${nodes['ahn-5'].firstName}.`,
      parentIds: [uncleId],
      spouseIds: [],
      childrenIds: [],
    };

    // Maternal Aunt (sister of Mother ahn-3, child of ahn-6 & ahn-7)
    const aSeed = hashString(`${baseSeed}-mat-aunt`);
    const auntBirth = nodes['ahn-3'].birthYear - 2;
    const auntId = 'ext-aunt-mat';
    nodes[auntId] = {
      id: auntId,
      ahnentafel: null,
      firstName: pickFrom(secondaryDataset.femaleFirstNames, aSeed, 7),
      lastName: motherParsed.last,
      gender: 'female',
      generation: 1,
      branch: 'maternal',
      relationshipLabel: 'Maternal Aunt',
      birthDate: `${auntBirth}-11-04`,
      birthYear: auntBirth,
      deathYear: computeDeathYear(auntBirth, aSeed),
      isLiving: computeDeathYear(auntBirth, aSeed) === null,
      birthplace: nodes['ahn-6'].birthplace,
      originRegion: secondaryDataset.label,
      coordinates: nodes['ahn-6'].coordinates,
      occupation: selectOccupation(secondaryDataset, auntBirth, aSeed),
      archivalCitation: selectCitation(secondaryDataset, auntBirth, secondaryDataset.ancestralPlaces[1], aSeed),
      bioNote: `Sister of ${motherParsed.first}, linking the maternal ${motherParsed.last} heritage.`,
      parentIds: ['ahn-6', 'ahn-7'],
      spouseIds: [],
      childrenIds: ['ext-cousin-2'],
    };
    nodes['ahn-6'].childrenIds.push(auntId);
    nodes['ahn-7'].childrenIds.push(auntId);

    // First Cousin (Maternal side)
    const c2Seed = hashString(`${baseSeed}-cousin-2`);
    const c2Birth = userBirthYear - 1;
    nodes['ext-cousin-2'] = {
      id: 'ext-cousin-2',
      ahnentafel: null,
      firstName: pickFrom(secondaryDataset.maleFirstNames, c2Seed, 4),
      lastName: pickFrom(secondaryDataset.surnames, c2Seed, 8),
      gender: 'male',
      generation: 0,
      branch: 'extended',
      relationshipLabel: 'First Cousin (Maternal)',
      birthDate: `${c2Birth}-04-22`,
      birthYear: c2Birth,
      deathYear: null,
      isLiving: true,
      birthplace: nodes[auntId].birthplace,
      originRegion: secondaryDataset.label,
      coordinates: nodes[auntId].coordinates,
      occupation: selectOccupation(secondaryDataset, c2Birth, c2Seed),
      archivalCitation: `Civic Registry · ${nodes[auntId].birthplace} (${c2Birth})`,
      bioNote: `Maternal first cousin connected through grandparents ${nodes['ahn-6'].firstName} and ${nodes['ahn-7'].firstName}.`,
      parentIds: [auntId],
      spouseIds: [],
      childrenIds: [],
    };
  }

  const totalPeople = Object.keys(nodes).length;
  const earliestBirth = Math.min(...Object.values(nodes).map((n) => n.birthYear));

  return {
    profile,
    rootId,
    nodes,
    createdAt: new Date().toISOString(),
    lineageSummary: `${totalPeople} documented relatives across 6 generational tiers (${earliestBirth}–${REFERENCE_YEAR}), bridging ${primaryDataset.label} and ${secondaryDataset.label} archives.`,
  };
}

/**
 * Shortest genealogical path between rootId and targetId across parent/child/spouse edges.
 */
export function traceLineagePath(
  nodes: Record<string, PersonNode>,
  rootId: string,
  targetId: string
): LineagePathResult | null {
  if (!nodes[rootId] || !nodes[targetId]) return null;
  if (rootId === targetId) {
    return {
      targetId,
      steps: [{ node: nodes[rootId], relationFromPrev: 'Root' }],
      generationDistance: 0,
      estimatedSharedLineagePct: 100,
      description: 'Focal root individual.',
    };
  }

  interface QueueItem {
    id: string;
    path: { id: string; relation: string }[];
  }

  const visited = new Set<string>([rootId]);
  const queue: QueueItem[] = [{ id: rootId, path: [{ id: rootId, relation: 'Root' }] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodes[current.id];
    if (!node) continue;

    const neighbors: { id: string; relation: string }[] = [];
    node.parentIds.forEach((pid) => {
      if (nodes[pid]) {
        const p = nodes[pid];
        neighbors.push({ id: pid, relation: p.gender === 'male' ? 'Father' : p.gender === 'female' ? 'Mother' : 'Parent' });
      }
    });
    node.childrenIds.forEach((cid) => {
      if (nodes[cid]) {
        const c = nodes[cid];
        neighbors.push({ id: cid, relation: c.gender === 'male' ? 'Son' : c.gender === 'female' ? 'Daughter' : 'Child' });
      }
    });
    node.spouseIds.forEach((sid) => {
      if (nodes[sid]) {
        neighbors.push({ id: sid, relation: 'Spouse' });
      }
    });

    for (const next of neighbors) {
      if (visited.has(next.id)) continue;
      visited.add(next.id);
      const nextPath = [...current.path, next];
      if (next.id === targetId) {
        const steps: LineagePathStep[] = nextPath.map((item) => ({
          node: nodes[item.id],
          relationFromPrev: item.relation,
        }));
        const targetNode = nodes[targetId];
        const genDist = Math.abs(targetNode.generation - nodes[rootId].generation);
        // Compute estimated shared ancestry/DNA percentage
        let pct = 0;
        const hasSpouseStep = nextPath.some((s) => s.relation === 'Spouse');
        if (hasSpouseStep) {
          pct = 0;
        } else if (targetNode.ahnentafel && targetNode.ahnentafel > 1) {
          pct = 100 / Math.pow(2, targetNode.generation);
        } else {
          // Sibling = 50%, Aunt/Uncle = 25%, First Cousin = 12.5%
          const edgeSteps = nextPath.length - 1;
          pct = edgeSteps === 2 ? 50 : edgeSteps === 3 ? 25 : edgeSteps === 4 ? 12.5 : 6.25;
        }
        return {
          targetId,
          steps,
          generationDistance: genDist,
          estimatedSharedLineagePct: pct,
          description: `${targetNode.relationshipLabel} · ${nextPath.length - 1} genealogical link${
            nextPath.length - 1 === 1 ? '' : 's'
          } from you`,
        };
      }
      queue.push({ id: next.id, path: nextPath });
    }
  }

  return null;
}

function getAncestorDepths(nodes: Record<string, PersonNode>, startId: string): Map<string, number> {
  const depths = new Map<string, number>();
  const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
  depths.set(startId, 0);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const node = nodes[curr.id];
    if (!node) continue;
    for (const pid of node.parentIds) {
      if (!nodes[pid]) continue;
      const nextDepth = curr.depth + 1;
      if (!depths.has(pid) || nextDepth < depths.get(pid)!) {
        depths.set(pid, nextDepth);
        queue.push({ id: pid, depth: nextDepth });
      }
    }
  }
  return depths;
}

function formatOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function describeKinshipFromSteps(
  upA: number,
  upB: number,
  lcaCount: number,
  personB: PersonNode
): { title: string; explanation: string } {
  if (upA === 0 && upB === 0) {
    return { title: 'Same Individual', explanation: 'Both selections point to the same person.' };
  }
  if (upB === 0) {
    // B is an ancestor of A
    if (upA === 1) return { title: personB.gender === 'male' ? 'Father' : personB.gender === 'female' ? 'Mother' : 'Parent', explanation: 'Direct parent (1 generation ascending).' };
    if (upA === 2) return { title: personB.gender === 'male' ? 'Grandfather' : personB.gender === 'female' ? 'Grandmother' : 'Grandparent', explanation: 'Direct grandparent (2 generations ascending).' };
    if (upA === 3) return { title: personB.gender === 'male' ? 'Great-Grandfather' : personB.gender === 'female' ? 'Great-Grandmother' : 'Great-Grandparent', explanation: 'Direct great-grandparent (3 generations ascending).' };
    const prefix = formatOrdinal(upA - 2);
    return {
      title: `${prefix} Great-${personB.gender === 'male' ? 'Grandfather' : personB.gender === 'female' ? 'Grandmother' : 'Grandparent'}`,
      explanation: `Direct lineal ancestor ${upA} generations above.`,
    };
  }
  if (upA === 0) {
    // B is a descendant of A
    if (upB === 1) return { title: personB.gender === 'male' ? 'Son' : personB.gender === 'female' ? 'Daughter' : 'Child', explanation: 'Direct child (1 generation descending).' };
    if (upB === 2) return { title: personB.gender === 'male' ? 'Grandson' : personB.gender === 'female' ? 'Granddaughter' : 'Grandchild', explanation: 'Direct grandchild (2 generations descending).' };
    return {
      title: `${upB === 3 ? '' : `${formatOrdinal(upB - 2)} `}Great-Grandchild`.trim(),
      explanation: `Direct lineal descendant ${upB} generations below.`,
    };
  }
  if (upA === 1 && upB === 1) {
    const full = lcaCount >= 2;
    return {
      title: full
        ? personB.gender === 'male'
          ? 'Full Brother'
          : personB.gender === 'female'
          ? 'Full Sister'
          : 'Full Sibling'
        : 'Half-Sibling',
      explanation: full
        ? 'Shares both parents as common ancestors.'
        : 'Shares one parent as a common ancestor.',
    };
  }
  if (upB === 1 && upA >= 2) {
    const base = personB.gender === 'male' ? 'Uncle' : personB.gender === 'female' ? 'Aunt' : 'Aunt / Uncle';
    const greats = upA - 2;
    const title = greats === 0 ? base : greats === 1 ? `Great-${base}` : `${formatOrdinal(greats)} Great-${base}`;
    return {
      title,
      explanation: `${personB.firstName} is a sibling of a direct ancestor ${upA - 1} generation${upA - 1 === 1 ? '' : 's'} above.`,
    };
  }
  if (upA === 1 && upB >= 2) {
    const base = personB.gender === 'male' ? 'Nephew' : personB.gender === 'female' ? 'Niece' : 'Niece / Nephew';
    const greats = upB - 2;
    const title = greats === 0 ? base : greats === 1 ? `Great-${base}` : `${formatOrdinal(greats)} Great-${base}`;
    return {
      title,
      explanation: `${personB.firstName} descends ${upB - 1} generation${upB - 1 === 1 ? '' : 's'} from a sibling.`,
    };
  }

  const cousinDegree = Math.min(upA, upB) - 1;
  const removed = Math.abs(upA - upB);
  const removedText = removed > 0 ? ` (${removed}x Removed)` : '';
  return {
    title: `${formatOrdinal(cousinDegree)} Cousin${removedText}`,
    explanation: `Connected via lowest common ancestor${lcaCount > 1 ? 's' : ''} (${upA} steps up from first, ${upB} steps up from second).`,
  };
}

/**
 * Computes exact Lowest Common Ancestor(s), genealogical relationship title,
 * and Wright's Coefficient of Relationship (r) between any two people in the tree.
 */
export function analyzeRelationship(
  nodes: Record<string, PersonNode>,
  idA: string,
  idB: string
): RelationshipAnalysis | null {
  const personA = nodes[idA];
  const personB = nodes[idB];
  if (!personA || !personB) return null;

  const ahnChainB: number[] = [];
  if (personB.ahnentafel) {
    let curr = personB.ahnentafel;
    while (curr >= 1) {
      ahnChainB.push(curr);
      curr = Math.floor(curr / 2);
    }
  }

  const shortestPathResult = traceLineagePath(nodes, idA, idB);
  const shortestPath = shortestPathResult?.steps ?? [];

  // Check direct spouse edge first
  if (personA.spouseIds.includes(idB)) {
    return {
      personA,
      personB,
      relationshipTitle: 'Spouse / Partner',
      explanation: 'Connected directly by partnership/marriage with 0% consanguineous overlap.',
      commonAncestors: [],
      stepsUpFromA: 0,
      stepsUpFromB: 0,
      shortestPath,
      wrightCoefficientPct: 0,
      ahnentafelChainB: ahnChainB,
    };
  }

  const depthsA = getAncestorDepths(nodes, idA);
  const depthsB = getAncestorDepths(nodes, idB);

  let minTotalSteps = Infinity;
  let bestPair: { upA: number; upB: number } = { upA: 0, upB: 0 };
  const candidateCommon: { id: string; upA: number; upB: number; sum: number }[] = [];

  for (const [ancId, dA] of depthsA.entries()) {
    if (!depthsB.has(ancId)) continue;
    const dB = depthsB.get(ancId)!;
    const sum = dA + dB;
    candidateCommon.push({ id: ancId, upA: dA, upB: dB, sum });
    if (sum < minTotalSteps) {
      minTotalSteps = sum;
      bestPair = { upA: dA, upB: dB };
    }
  }

  if (candidateCommon.length === 0) {
    return {
      personA,
      personB,
      relationshipTitle: shortestPath.length > 0 ? 'Related by Marriage / Affinal Link' : 'Unlinked Branch',
      explanation:
        shortestPath.length > 0
          ? 'Connected across an affinal (marriage) bridge rather than a shared ancestor.'
          : 'No common ancestor documented in the current graph.',
      commonAncestors: [],
      stepsUpFromA: 0,
      stepsUpFromB: 0,
      shortestPath,
      wrightCoefficientPct: 0,
      ahnentafelChainB: ahnChainB,
    };
  }

  const minimalLCAs = candidateCommon
    .filter((c) => c.sum === minTotalSteps)
    .map((c) => nodes[c.id]);

  // Wright's coefficient r = sum over minimal LCAs of (0.5)^(upA + upB)
  const wrightR =
    bestPair.upA === 0 && bestPair.upB === 0
      ? 1
      : candidateCommon
          .filter((c) => c.sum === minTotalSteps)
          .reduce((acc, c) => acc + Math.pow(0.5, c.upA + c.upB), 0);

  const { title, explanation } = describeKinshipFromSteps(
    bestPair.upA,
    bestPair.upB,
    minimalLCAs.length,
    personB
  );

  return {
    personA,
    personB,
    relationshipTitle: title,
    explanation,
    commonAncestors: minimalLCAs,
    stepsUpFromA: bestPair.upA,
    stepsUpFromB: bestPair.upB,
    shortestPath,
    wrightCoefficientPct: Number((wrightR * 100).toFixed(3)),
    ahnentafelChainB: ahnChainB,
  };
}

/**
 * Generates scored historical archive & surname match candidates tailored to the user's
 * entered profile that can be inspected or linked directly into the live family tree.
 */
export function findArchivalMatches(tree: FamilyTreeData): SurnameMatchCandidate[] {
  const dataset = HERITAGE_DATASETS[tree.profile.regionId];
  const root = tree.nodes[tree.rootId];
  const seed = hashString(`${tree.profile.fullName}|${tree.profile.dob}|archive-matches`);

  const paternalGf = tree.nodes['ahn-4'];
  const maternalGm = tree.nodes['ahn-7'];
  const greatGf = tree.nodes['ahn-8'];

  const candidates: SurnameMatchCandidate[] = [];

  if (paternalGf) {
    const birthYear = paternalGf.birthYear + 4;
    const place = dataset.ancestralPlaces[1] || dataset.defaultModernPlace;
    candidates.push({
      id: `match-pat-aunt-${seed % 999}`,
      fullName: `${pickFrom(dataset.femaleFirstNames, seed, 10)} ${paternalGf.lastName}`,
      birthYear,
      deathYear: birthYear + 74,
      birthplace: `${place.city}, ${place.country}`,
      occupation: selectOccupation(dataset, birthYear, seed + 2),
      archiveSource: selectCitation(dataset, birthYear, place, seed + 3),
      matchScore: 94,
      matchBasis: `Exact paternal surname match (${paternalGf.lastName}) + cohort alignment (${birthYear}) in ${place.city}`,
      suggestedAnchorId: paternalGf.id,
      suggestedRelation: 'sibling',
    });
  }

  if (greatGf) {
    const birthYear = greatGf.birthYear - 28;
    const place = dataset.ancestralPlaces[Math.min(3, dataset.ancestralPlaces.length - 1)];
    candidates.push({
      id: `match-pat-founder-${seed % 777}`,
      fullName: `${pickFrom(dataset.maleFirstNames, seed, 14)} ${greatGf.lastName}`,
      birthYear,
      deathYear: birthYear + 69,
      birthplace: `${place.city}, ${place.country}`,
      occupation: selectOccupation(dataset, birthYear, seed + 5),
      archiveSource: selectCitation(dataset, birthYear, place, seed + 6),
      matchScore: 89,
      matchBasis: `Pre-1890 parish register match for ${greatGf.lastName} line along ${place.city} corridor`,
      suggestedAnchorId: 'ahn-17',
      suggestedRelation: 'parent',
    });
  }

  if (maternalGm) {
    const birthYear = maternalGm.birthYear - 2;
    const secondary = HERITAGE_DATASETS[dataset.secondaryRegionId];
    const place = secondary.ancestralPlaces[1] || secondary.defaultModernPlace;
    candidates.push({
      id: `match-mat-kin-${seed % 555}`,
      fullName: `${pickFrom(secondary.maleFirstNames, seed, 12)} ${maternalGm.lastName}`,
      birthYear,
      deathYear: birthYear + 78,
      birthplace: `${place.city}, ${place.country}`,
      occupation: selectOccupation(secondary, birthYear, seed + 8),
      archiveSource: selectCitation(secondary, birthYear, place, seed + 9),
      matchScore: 86,
      matchBasis: `Maternal maiden-name match (${maternalGm.lastName}) in ${secondary.label} civil roll`,
      suggestedAnchorId: maternalGm.id,
      suggestedRelation: 'sibling',
    });
  }

  // Filter out any candidate already linked by name
  const existingNames = new Set(
    Object.values(tree.nodes).map((n) => `${n.firstName} ${n.lastName}`.toLowerCase())
  );
  return candidates.filter((c) => !existingNames.has(c.fullName.toLowerCase()) && c.fullName !== `${root.firstName} ${root.lastName}`);
}

export function computeTreeGraphMetrics(tree: FamilyTreeData): TreeGraphMetrics {
  const nodes = Object.values(tree.nodes);
  let linkCount = 0;
  let gapSum = 0;
  let gapCount = 0;
  let lifespanSum = 0;
  let lifespanCount = 0;

  for (const node of nodes) {
    linkCount += node.parentIds.length + node.spouseIds.length;
    for (const pid of node.parentIds) {
      const parent = tree.nodes[pid];
      if (parent && node.birthYear > parent.birthYear) {
        gapSum += node.birthYear - parent.birthYear;
        gapCount += 1;
      }
    }
    if (node.deathYear && node.deathYear > node.birthYear) {
      lifespanSum += node.deathYear - node.birthYear;
      lifespanCount += 1;
    }
  }

  return {
    totalNodes: nodes.length,
    totalLinks: linkCount,
    avgGenerationGap: gapCount > 0 ? Number((gapSum / gapCount).toFixed(1)) : 28.0,
    avgDocumentedLifespan: lifespanCount > 0 ? Math.round(lifespanSum / lifespanCount) : 76,
    earliestYear: Math.min(...nodes.map((n) => n.birthYear)),
    paternalCount: nodes.filter((n) => n.branch === 'paternal').length,
    maternalCount: nodes.filter((n) => n.branch === 'maternal').length,
  };
}

