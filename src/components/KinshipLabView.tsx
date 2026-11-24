import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, ExternalLink, GitMerge, Globe, Link2, Loader2 } from 'lucide-react';
import { FamilyTreeData, GroundedResearchResult, PersonNode, SurnameMatchCandidate } from '../types/genealogy';
import {
  analyzeRelationship,
  computeTreeGraphMetrics,
  findArchivalMatches,
} from '../utils/lineageEngine';

interface KinshipLabViewProps {
  tree: FamilyTreeData;
  selectedId: string;
  compareTargetId: string | null;
  onSelectPerson: (id: string) => void;
  onLinkMatchCandidate: (candidate: SurnameMatchCandidate) => void;
}

export const KinshipLabView: React.FC<KinshipLabViewProps> = ({
  tree,
  selectedId,
  compareTargetId,
  onSelectPerson,
  onLinkMatchCandidate,
}) => {
  const allNodes = useMemo(
    () =>
      Object.values(tree.nodes).sort(
        (a, b) => a.generation - b.generation || a.birthYear - b.birthYear
      ),
    [tree.nodes]
  );

  const [personAId, setPersonAId] = useState<string>(tree.rootId);
  const [personBId, setPersonBId] = useState<string>(
    compareTargetId || (tree.nodes['ext-cousin-1'] ? 'ext-cousin-1' : 'ahn-4')
  );

  useEffect(() => {
    if (compareTargetId && tree.nodes[compareTargetId]) {
      setPersonAId(tree.rootId);
      setPersonBId(compareTargetId);
    }
  }, [compareTargetId, tree.rootId, tree.nodes]);

  const analysis = useMemo(
    () => analyzeRelationship(tree.nodes, personAId, personBId),
    [tree.nodes, personAId, personBId]
  );

  const archivalMatches = useMemo(() => findArchivalMatches(tree), [tree]);
  const graphMetrics = useMemo(() => computeTreeGraphMetrics(tree), [tree]);

  const rootNode = tree.nodes[tree.rootId];
  const [archiveQuerySurname, setArchiveQuerySurname] = useState(rootNode.lastName);
  const [archiveQueryPlace, setArchiveQueryPlace] = useState(tree.profile.birthplace);
  const [archiveResearch, setArchiveResearch] = useState<GroundedResearchResult | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    setArchiveQuerySurname(tree.nodes[tree.rootId].lastName);
    setArchiveQueryPlace(tree.profile.birthplace);
    setArchiveResearch(null);
    setArchiveError(null);
  }, [tree.rootId, tree.profile.birthplace, tree.nodes]);

  const handleSearchLiveArchives = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveQuerySurname.trim()) return;
    setArchiveLoading(true);
    setArchiveError(null);
    try {
      const res = await fetch('/api/research/surname-archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surname: archiveQuerySurname.trim(),
          birthplace: archiveQueryPlace.trim(),
          regionLabel: rootNode.originRegion,
          earliestYear: graphMetrics.earliestYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to query genealogical archives.');
      }
      setArchiveResearch({
        summary: data.summary || '',
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Archive search failed.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const inspectedNode: PersonNode | undefined = tree.nodes[selectedId];

  const handleSwap = () => {
    setPersonAId(personBId);
    setPersonBId(personAId);
  };

  return (
    <div className="space-y-6">
      {/* 1. Interactive Two-Person Relationship & Consanguinity Calculator */}
      <section className="bg-white border border-[#E4DDD0] rounded-lg overflow-hidden">
        <div className="px-5 py-4 bg-[#F6F2EA] border-b border-[#E4DDD0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#1C1917]">
              Two-Person Relationship &amp; Kinship Calculator
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              Computes Lowest Common Ancestor (LCA), cousin-removal degree, and Wright&apos;s coefficient of relationship
            </p>
          </div>
          <button
            type="button"
            onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#292524] bg-white border border-[#D6CEBE] rounded-md hover:bg-[#F3EFE7] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Swap Pair</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Selector Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="kinship-person-a" className="block text-xs font-semibold text-[#292524] mb-1.5">
                Person A (Perspective)
              </label>
              <select
                id="kinship-person-a"
                value={personAId}
                onChange={(e) => setPersonAId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
              >
                {allNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.firstName} {n.lastName} — {n.relationshipLabel} (b. {n.birthYear})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="kinship-person-b" className="block text-xs font-semibold text-[#292524] mb-1.5">
                Person B (Relative)
              </label>
              <select
                id="kinship-person-b"
                value={personBId}
                onChange={(e) => setPersonBId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
              >
                {allNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.firstName} {n.lastName} — {n.relationshipLabel} (b. {n.birthYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculation Readout */}
          {analysis && (
            <div className="bg-[#FBF9F5] border border-[#E4DDD0] rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-[#E4DDD0]">
                <div>
                  <div className="text-xs text-[#6B6257]">
                    <span>{analysis.personA.firstName} {analysis.personA.lastName}</span>
                    <span className="mx-1.5" aria-hidden="true">→</span>
                    <span>{analysis.personB.firstName} {analysis.personB.lastName}</span>
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-[#1E3A8A] mt-1">
                    {analysis.relationshipTitle}
                  </h3>
                  <p className="text-xs text-[#44403C] mt-1">{analysis.explanation}</p>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-[11px] text-[#6B6257]">Wright&apos;s Coefficient (r)</div>
                    <div className="font-mono tabular-nums text-lg font-semibold text-[#1C1917]">
                      {analysis.wrightCoefficientPct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#6B6257]">Generational Hops</div>
                    <div className="font-mono tabular-nums text-lg font-semibold text-[#1C1917]">
                      {analysis.stepsUpFromA}↑ / {analysis.stepsUpFromB}↓
                    </div>
                  </div>
                </div>
              </div>

              {/* Lowest Common Ancestor(s) */}
              {analysis.commonAncestors.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[#292524] flex items-center gap-1.5 mb-2">
                    <GitMerge className="w-3.5 h-3.5 text-[#854D0E]" aria-hidden="true" />
                    <span>
                      Lowest Common Ancestor{analysis.commonAncestors.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {analysis.commonAncestors.map((lca) => (
                      <button
                        key={lca.id}
                        type="button"
                        onClick={() => onSelectPerson(lca.id)}
                        className="text-left px-3.5 py-2.5 bg-white border border-[#E4DDD0] rounded-md hover:border-[#1E3A8A] transition-colors cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-[#1C1917]">
                          {lca.firstName} {lca.lastName}
                        </div>
                        <div className="text-[11px] text-[#6B6257] font-mono tabular-nums mt-0.5">
                          {lca.birthYear}–{lca.deathYear ?? 'Now'} · {lca.birthplace}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Shortest Kinship Bridge */}
              {analysis.shortestPath.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-[#292524] mb-2">
                    Step-by-Step Graph Bridge ({analysis.shortestPath.length - 1} edges)
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {analysis.shortestPath.map((step, i) => (
                      <React.Fragment key={step.node.id}>
                        {i > 0 && (
                          <span className="text-[#854D0E] font-mono text-[11px]">
                            —[{step.relationFromPrev}]→
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectPerson(step.node.id)}
                          className="px-2.5 py-1 bg-white border border-[#D6CEBE] rounded text-[#1C1917] hover:border-[#1E3A8A] cursor-pointer"
                        >
                          {step.node.firstName} {step.node.lastName}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2. Surname & Historical Archive Record Matcher */}
      <section className="bg-white border border-[#E4DDD0] rounded-lg overflow-hidden">
        <div className="px-5 py-4 bg-[#F6F2EA] border-b border-[#E4DDD0]">
          <h2 className="font-serif text-lg font-semibold text-[#1C1917]">
            Archival Record &amp; Surname Candidates
          </h2>
          <p className="text-xs text-[#57534E] mt-0.5">
            Probable extended kin discovered by matching surname lineage, birth cohort, and regional parish rolls
          </p>
        </div>

        <div className="p-5">
          {archivalMatches.length === 0 ? (
            <div className="flex items-center gap-2.5 text-xs text-[#14532D] bg-[#F0F7F2] border border-[#C5DEC9] rounded-md px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>All archival match candidates for this profile have been linked into your family tree.</span>
            </div>
          ) : (
            <div className="divide-y divide-[#EFE9DD]">
              {archivalMatches.map((cand) => {
                const anchor = tree.nodes[cand.suggestedAnchorId];
                return (
                  <div
                    key={cand.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs text-[#6B6257] font-mono tabular-nums">
                        <span className="font-semibold text-[#14532D]">{cand.matchScore}% match confidence</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{cand.birthYear}–{cand.deathYear ?? 'Present'}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{cand.birthplace}</span>
                      </div>
                      <h3 className="font-serif text-base font-semibold text-[#1C1917]">
                        {cand.fullName}
                      </h3>
                      <p className="text-xs text-[#44403C]">{cand.matchBasis}</p>
                      <p className="text-[11px] text-[#6B6257]">
                        Source: {cand.archiveSource} · {cand.occupation}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onLinkMatchCandidate(cand)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1E3A8A] bg-[#F3EFE7] border border-[#D6CEBE] rounded-md hover:bg-[#EAE3D5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        Link as {anchor ? `${anchor.firstName}'s ${cand.suggestedRelation}` : 'Relative'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3. Graph & Ahnentafel Algorithm Breakdown */}
      <section className="bg-white border border-[#E4DDD0] rounded-lg p-5">
        <h2 className="font-serif text-lg font-semibold text-[#1C1917]">
          Graph &amp; Ahnentafel Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t border-[#EFE9DD] text-xs">
          <div>
            <div className="text-[#6B6257]">Graph Nodes</div>
            <div className="font-mono tabular-nums text-base font-semibold text-[#1C1917] mt-0.5">
              {graphMetrics.totalNodes}
            </div>
          </div>
          <div>
            <div className="text-[#6B6257]">Kinship Edges</div>
            <div className="font-mono tabular-nums text-base font-semibold text-[#1C1917] mt-0.5">
              {graphMetrics.totalLinks}
            </div>
          </div>
          <div>
            <div className="text-[#6B6257]">Mean Gen Gap</div>
            <div className="font-mono tabular-nums text-base font-semibold text-[#1C1917] mt-0.5">
              {graphMetrics.avgGenerationGap} yrs
            </div>
          </div>
          <div>
            <div className="text-[#6B6257]">Mean Lifespan</div>
            <div className="font-mono tabular-nums text-base font-semibold text-[#1C1917] mt-0.5">
              {graphMetrics.avgDocumentedLifespan} yrs
            </div>
          </div>
          <div>
            <div className="text-[#6B6257]">Paternal / Maternal</div>
            <div className="font-mono tabular-nums text-base font-semibold text-[#1C1917] mt-0.5">
              {graphMetrics.paternalCount} / {graphMetrics.maternalCount}
            </div>
          </div>
          <div>
            <div className="text-[#6B6257]">Ahnentafel Binary</div>
            <div className="font-mono tabular-nums text-base font-semibold text-[#1E3A8A] mt-0.5">
              {inspectedNode?.ahnentafel
                ? `#${inspectedNode.ahnentafel} (${inspectedNode.ahnentafel.toString(2)})`
                : 'Lateral'}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Live Surname & Historical Registry Lookup (Google Search Grounded) */}
      <section className="bg-white border border-[#E4DDD0] rounded-lg overflow-hidden">
        <div className="px-5 py-4 bg-[#F6F2EA] border-b border-[#E4DDD0]">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#14532D]" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-[#1C1917]">
              Live Surname &amp; Archive Repository Search
            </h2>
          </div>
          <p className="text-xs text-[#57534E] mt-0.5">
            Uses Google Search grounding to retrieve up-to-date surname etymology and official national or parish record offices
          </p>
        </div>

        <div className="p-5 space-y-4">
          <form onSubmit={handleSearchLiveArchives} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label htmlFor="archive-surname" className="block text-xs font-semibold text-[#292524] mb-1">
                Family Surname
              </label>
              <input
                id="archive-surname"
                type="text"
                required
                value={archiveQuerySurname}
                onChange={(e) => setArchiveQuerySurname(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div className="sm:col-span-5">
              <label htmlFor="archive-place" className="block text-xs font-semibold text-[#292524] mb-1">
                Target City or Region
              </label>
              <input
                id="archive-place"
                type="text"
                value={archiveQueryPlace}
                onChange={(e) => setArchiveQueryPlace(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={archiveLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#FBF9F5] bg-[#14532D] rounded-md hover:bg-[#104224] transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {archiveLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <span>Search Repositories</span>
                )}
              </button>
            </div>
          </form>

          {archiveError && (
            <div className="px-4 py-3 text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-md">
              {archiveError}
            </div>
          )}

          {archiveResearch && (
            <div className="bg-[#FBF9F5] border border-[#E4DDD0] rounded-lg p-4 space-y-3">
              <div className="text-xs sm:text-sm text-[#292524] leading-relaxed whitespace-pre-line">
                {archiveResearch.summary}
              </div>

              {archiveResearch.sources.length > 0 && (
                <div className="pt-3 border-t border-[#E4DDD0]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6257] mb-2">
                    Verified Web Sources
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {archiveResearch.sources.map((src) => (
                      <a
                        key={src.uri}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#1E3A8A] hover:underline truncate"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{src.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
