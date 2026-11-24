import React, { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { FamilyTreeData, PersonNode } from '../types/genealogy';
import { AncestralGoogleMap, MigrationVector } from './AncestralGoogleMap';

interface TimelineOriginsViewProps {
  tree: FamilyTreeData;
  selectedId: string;
  mapsApiKey: string;
  onSelectPerson: (id: string) => void;
}

const REFERENCE_YEAR = 2026;

export const TimelineOriginsView: React.FC<TimelineOriginsViewProps> = ({
  tree,
  selectedId,
  mapsApiKey,
  onSelectPerson,
}) => {
  const [sortBy, setSortBy] = useState<'birth' | 'generation'>('birth');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const rootNode = tree.nodes[tree.rootId];
  const allNodes = useMemo(() => Object.values(tree.nodes), [tree.nodes]);

  const sortedNodes = useMemo(() => {
    return [...allNodes].sort((a, b) => {
      if (sortBy === 'birth') return a.birthYear - b.birthYear;
      return b.generation - a.generation || a.birthYear - b.birthYear;
    });
  }, [allNodes, sortBy]);

  const minYear = useMemo(() => {
    const earliest = Math.min(...allNodes.map((n) => n.birthYear));
    return Math.floor((earliest - 10) / 20) * 20;
  }, [allNodes]);

  const totalSpan = REFERENCE_YEAR - minYear;
  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let y = minYear; y <= REFERENCE_YEAR; y += 30) {
      arr.push(y);
    }
    return arr;
  }, [minYear]);

  const overlappedCount = useMemo(() => {
    return allNodes.filter((n) => {
      if (n.id === rootNode.id) return false;
      const death = n.deathYear ?? REFERENCE_YEAR;
      return death >= rootNode.birthYear && n.birthYear <= REFERENCE_YEAR;
    }).length;
  }, [allNodes, rootNode]);

  // Group nodes by birthplace city for Migration Map
  const cityGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        place: string;
        coords: { lat: number; lon: number };
        people: PersonNode[];
        earliestGen: number;
      }
    >();
    for (const node of allNodes) {
      const existing = map.get(node.birthplace);
      if (existing) {
        existing.people.push(node);
        existing.earliestGen = Math.max(existing.earliestGen, node.generation);
      } else {
        map.set(node.birthplace, {
          place: node.birthplace,
          coords: node.coordinates,
          people: [node],
          earliestGen: node.generation,
        });
      }
    }
    return Array.from(map.values());
  }, [allNodes]);

  // Build migration vectors from parent birthplace -> child birthplace when they differ
  const migrationVectors = useMemo<MigrationVector[]>(() => {
    const vectors: MigrationVector[] = [];
    const seen = new Set<string>();

    for (const node of allNodes) {
      for (const pid of node.parentIds) {
        const parent = tree.nodes[pid];
        if (!parent || parent.birthplace === node.birthplace) continue;
        const key = `${parent.birthplace}->${node.birthplace}`;
        if (seen.has(key)) continue;
        seen.add(key);
        vectors.push({
          id: key,
          from: { lat: parent.coordinates.lat, lng: parent.coordinates.lon },
          to: { lat: node.coordinates.lat, lng: node.coordinates.lon },
          branch: parent.branch,
        });
      }
    }
    return vectors;
  }, [allNodes, tree.nodes]);

  const activeCityGroup =
    cityGroups.find((g) => g.place === selectedCity) ||
    cityGroups.find((g) => g.people.some((p) => p.id === selectedId)) ||
    cityGroups[0];

  return (
    <div className="space-y-6">
      {/* 1. Chronological Lifespan Overlap Matrix */}
      <section className="bg-white border border-[#E4DDD0] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-[#F6F2EA] border-b border-[#E4DDD0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#1C1917]">
              Generational Lifespan &amp; Overlap Timeline
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              <span className="font-mono tabular-nums font-semibold text-[#1E3A8A]">
                {overlappedCount}
              </span>{' '}
              relatives lived concurrently with your lifetime (b.{' '}
              <span className="font-mono tabular-nums">{rootNode.birthYear}</span>)
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#EAE3D5] rounded-md">
            <button
              type="button"
              onClick={() => setSortBy('birth')}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                sortBy === 'birth' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
              }`}
            >
              Sort by Birth Year
            </button>
            <button
              type="button"
              onClick={() => setSortBy('generation')}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                sortBy === 'generation' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
              }`}
            >
              Sort by Generation
            </button>
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <div className="min-w-[680px]">
            {/* Year Axis Header */}
            <div className="grid grid-cols-12 items-center pb-2 border-b border-[#E4DDD0] text-[11px] font-mono tabular-nums text-[#6B6257]">
              <div className="col-span-4">Relative &amp; Lineage Role</div>
              <div className="col-span-8 relative h-5">
                {ticks.map((year) => {
                  const leftPct = ((year - minYear) / totalSpan) * 100;
                  return (
                    <span
                      key={year}
                      style={{ left: `${leftPct}%` }}
                      className="absolute -translate-x-1/2"
                    >
                      {year}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Lifespan Rows */}
            <div className="divide-y divide-[#F3EFE7] max-h-[380px] overflow-y-auto relative">
              {sortedNodes.map((node) => {
                const startPct = ((node.birthYear - minYear) / totalSpan) * 100;
                const endYear = node.deathYear ?? REFERENCE_YEAR;
                const widthPct = Math.max(1.5, ((endYear - node.birthYear) / totalSpan) * 100);
                const rootBirthPct = ((rootNode.birthYear - minYear) / totalSpan) * 100;
                const isSelected = node.id === selectedId;
                const overlapsMe = endYear >= rootNode.birthYear && node.id !== rootNode.id;

                const barColor =
                  node.branch === 'self'
                    ? 'bg-[#1E3A8A]'
                    : node.branch === 'paternal'
                    ? 'bg-[#3B5998]'
                    : node.branch === 'maternal'
                    ? 'bg-[#166534]'
                    : 'bg-[#A16207]';

                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => onSelectPerson(node.id)}
                    className={`w-full grid grid-cols-12 items-center py-2 px-1 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#F0F4FA]' : 'hover:bg-[#FAF7F0]'
                    }`}
                  >
                    <div className="col-span-4 pr-3 min-w-0">
                      <div className="text-xs font-semibold text-[#1C1917] truncate">
                        {node.firstName} {node.lastName}
                      </div>
                      <div className="text-[11px] text-[#6B6257] truncate">
                        {node.relationshipLabel}
                        {overlapsMe ? ' · Overlapped' : ''}
                      </div>
                    </div>

                    <div className="col-span-8 relative h-6 flex items-center">
                      {/* Reference line for User's Birth Year */}
                      <div
                        style={{ left: `${rootBirthPct}%` }}
                        className="absolute top-0 bottom-0 w-px bg-[#854D0E]/50 pointer-events-none"
                      />
                      {/* Lifespan Bar */}
                      <div
                        style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                        className={`absolute h-3 rounded-xs ${barColor} ${
                          isSelected ? 'ring-2 ring-[#1C1917] ring-offset-1' : 'opacity-85'
                        }`}
                      />
                      <span
                        style={{ left: `${Math.min(88, startPct + widthPct + 1)}%` }}
                        className="absolute text-[10px] font-mono tabular-nums text-[#57534E] whitespace-nowrap"
                      >
                        {node.birthYear}–{node.deathYear ?? 'Now'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Ancestral Geographic Migration Atlas */}
      <section className="bg-white border border-[#E4DDD0] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-[#F6F2EA] border-b border-[#E4DDD0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#1C1917]">
              Ancestral Origins &amp; Migration Atlas
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              {cityGroups.length} geographic origin centers plotted across paternal and maternal generations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-8 bg-[#FBF9F5] p-4 border-b lg:border-b-0 lg:border-r border-[#E4DDD0]">
            <AncestralGoogleMap
              apiKey={mapsApiKey}
              cityGroups={cityGroups}
              migrationVectors={migrationVectors}
              activeCityPlace={activeCityGroup?.place ?? null}
              onSelectCity={(place, leadId) => {
                setSelectedCity(place);
                onSelectPerson(leadId);
              }}
            />
          </div>

          {/* City Relatives Directory */}
          <div className="lg:col-span-4 p-4 flex flex-col justify-between bg-white">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#854D0E]">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{activeCityGroup?.place}</span>
              </div>
              <p className="text-[11px] text-[#6B6257] mt-1">
                {activeCityGroup?.people.length} documented family member
                {activeCityGroup?.people.length === 1 ? '' : 's'} born in this hub
              </p>

              <ul className="mt-3 divide-y divide-[#EFE9DD] max-h-[260px] overflow-y-auto">
                {activeCityGroup?.people
                  .slice()
                  .sort((a, b) => a.birthYear - b.birthYear)
                  .map((person) => (
                    <li key={person.id} className="py-2">
                      <button
                        type="button"
                        onClick={() => onSelectPerson(person.id)}
                        className={`w-full text-left flex items-center justify-between gap-2 cursor-pointer ${
                          person.id === selectedId
                            ? 'text-[#1E3A8A] font-semibold'
                            : 'text-[#1C1917] hover:text-[#1E3A8A]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs truncate">
                            {person.firstName} {person.lastName}
                          </div>
                          <div className="text-[11px] text-[#6B6257] truncate">
                            {person.relationshipLabel}
                          </div>
                        </div>
                        <span className="font-mono tabular-nums text-[11px] text-[#57534E] shrink-0">
                          {person.birthYear}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="pt-3 mt-3 border-t border-[#EFE9DD] flex flex-wrap gap-1.5">
              {cityGroups.map((g) => (
                <button
                  key={g.place}
                  type="button"
                  onClick={() => setSelectedCity(g.place)}
                  className={`px-2.5 py-1 text-[11px] rounded border transition-colors cursor-pointer ${
                    activeCityGroup?.place === g.place
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                      : 'bg-[#FBF9F5] text-[#44403C] border-[#E4DDD0] hover:border-[#B5AA96]'
                  }`}
                >
                  {g.place.split(',')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
