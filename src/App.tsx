import React, { useEffect, useMemo, useState } from 'react';
import { Download, SlidersHorizontal } from 'lucide-react';
import { AddRelativeModal } from './components/AddRelativeModal';
import { FanChartCanvas } from './components/FanChartCanvas';
import { Header } from './components/Header';
import { IntakeStage } from './components/IntakeStage';
import { KinshipLabView } from './components/KinshipLabView';
import { PedigreeCanvas } from './components/PedigreeCanvas';
import { PersonInspector } from './components/PersonInspector';
import { TimelineOriginsView } from './components/TimelineOriginsView';
import { SAMPLE_PROFILES } from './data/heritageArchive';
import {
  FamilyTreeData,
  NewRelativeInput,
  PersonNode,
  SurnameMatchCandidate,
  UserProfileInput,
  VisualizationMode,
} from './types/genealogy';
import { generateExtendedFamilyTree, traceLineagePath } from './utils/lineageEngine';

const STORAGE_KEY = 'lineage_atlas_tree_v1';

export default function App() {
  const [tree, setTree] = useState<FamilyTreeData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as FamilyTreeData;
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  });

  const [activeSection, setActiveSection] = useState<'intake' | VisualizationMode>(() =>
    tree ? 'pedigree' : 'intake'
  );
  const [selectedId, setSelectedId] = useState<string>(() => tree?.rootId ?? 'ahn-1');
  const [addModalAnchorId, setAddModalAnchorId] = useState<string | null>(null);
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || ''
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  useEffect(() => {
    if (mapsApiKey) return;
    fetch('/api/config/maps')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.apiKey) setMapsApiKey(data.apiKey);
      })
      .catch(() => {
        // Ignore network errors on config check
      });
  }, [mapsApiKey]);

  useEffect(() => {
    if (tree) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
      } catch {
        // Ignore quota errors
      }
    }
  }, [tree]);

  const geocodePlaceAsync = async (address: string): Promise<{ lat: number; lon: number } | null> => {
    if (!address.trim()) return null;
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || data?.status === 'RESOURCE_EXHAUSTED') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        return null;
      }
      if (!res.ok || typeof data?.lat !== 'number' || typeof data?.lng !== 'number') {
        return null;
      }
      return { lat: data.lat, lon: data.lng };
    } catch {
      return null;
    }
  };

  const handleGenerateTree = (profile: UserProfileInput) => {
    const nextTree = generateExtendedFamilyTree(profile);
    setTree(nextTree);
    setSelectedId(nextTree.rootId);
    setActiveSection('pedigree');

    // Resolve real coordinates for custom birthplace via Google Geocoding API
    if (profile.birthplace.trim()) {
      const rootPlace = nextTree.nodes[nextTree.rootId].birthplace;
      geocodePlaceAsync(profile.birthplace).then((coords) => {
        if (!coords) return;
        setTree((prev) => {
          if (!prev) return prev;
          const updatedNodes: Record<string, PersonNode> = {};
          for (const [id, node] of Object.entries(prev.nodes)) {
            updatedNodes[id] =
              node.birthplace === rootPlace ? { ...node, coordinates: coords } : node;
          }
          return { ...prev, nodes: updatedNodes };
        });
      });
    }
  };

  const handleNavigate = (section: 'intake' | VisualizationMode) => {
    if (section !== 'intake' && !tree) {
      // Auto-build default sample tree if user clicks Explore Archive without filling form yet
      const fallbackTree = generateExtendedFamilyTree(SAMPLE_PROFILES[0].profile);
      setTree(fallbackTree);
      setSelectedId(fallbackTree.rootId);
    }
    setActiveSection(section);
  };

  const handleUpdatePerson = (updated: PersonNode) => {
    if (!tree) return;
    setTree({
      ...tree,
      nodes: {
        ...tree.nodes,
        [updated.id]: updated,
      },
    });
  };

  const handleAddRelative = (input: NewRelativeInput) => {
    if (!tree) return;
    const anchor = tree.nodes[input.anchorId];
    if (!anchor) return;

    const newId = `custom-${Date.now()}`;
    let generation = anchor.generation;
    let relationshipLabel = 'Relative';
    const parentIds: string[] = [];
    const childrenIds: string[] = [];
    const spouseIds: string[] = [];

    if (input.relationType === 'parent') {
      generation = anchor.generation + 1;
      relationshipLabel =
        input.gender === 'male' ? 'Father (Added)' : input.gender === 'female' ? 'Mother (Added)' : 'Parent (Added)';
      childrenIds.push(anchor.id);
    } else if (input.relationType === 'child') {
      generation = anchor.generation - 1;
      relationshipLabel =
        anchor.id === tree.rootId
          ? input.gender === 'male'
            ? 'Son'
            : input.gender === 'female'
            ? 'Daughter'
            : 'Child'
          : 'Descendant (Added)';
      parentIds.push(anchor.id);
    } else if (input.relationType === 'sibling') {
      generation = anchor.generation;
      relationshipLabel =
        input.gender === 'male' ? 'Brother' : input.gender === 'female' ? 'Sister' : 'Sibling';
      parentIds.push(...anchor.parentIds);
    } else if (input.relationType === 'spouse') {
      generation = anchor.generation;
      relationshipLabel = 'Spouse / Partner';
      spouseIds.push(anchor.id);
    }

    const newNode: PersonNode = {
      id: newId,
      ahnentafel: null,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender,
      generation,
      branch: anchor.branch === 'self' ? 'extended' : anchor.branch,
      relationshipLabel,
      birthDate: `${input.birthYear}-06-15`,
      birthYear: input.birthYear,
      deathYear: input.deathYear,
      isLiving: input.deathYear === null,
      birthplace: input.birthplace,
      originRegion: anchor.originRegion,
      coordinates: anchor.coordinates,
      occupation: input.occupation,
      archivalCitation: `User Family Addition (${new Date().getFullYear()})`,
      bioNote: input.bioNote,
      parentIds,
      spouseIds,
      childrenIds,
    };

    const nextNodes = { ...tree.nodes, [newId]: newNode };

    if (input.relationType === 'parent') {
      nextNodes[anchor.id] = {
        ...anchor,
        parentIds: [...anchor.parentIds, newId],
      };
    } else if (input.relationType === 'child') {
      nextNodes[anchor.id] = {
        ...anchor,
        childrenIds: [...anchor.childrenIds, newId],
      };
    } else if (input.relationType === 'spouse') {
      nextNodes[anchor.id] = {
        ...anchor,
        spouseIds: [...anchor.spouseIds, newId],
      };
    } else if (input.relationType === 'sibling') {
      for (const pid of anchor.parentIds) {
        if (nextNodes[pid]) {
          nextNodes[pid] = {
            ...nextNodes[pid],
            childrenIds: [...nextNodes[pid].childrenIds, newId],
          };
        }
      }
    }

    setTree({
      ...tree,
      nodes: nextNodes,
    });
    setSelectedId(newId);

    if (input.birthplace && input.birthplace !== anchor.birthplace) {
      geocodePlaceAsync(input.birthplace).then((coords) => {
        if (!coords) return;
        setTree((prev) => {
          if (!prev || !prev.nodes[newId]) return prev;
          return {
            ...prev,
            nodes: {
              ...prev.nodes,
              [newId]: { ...prev.nodes[newId], coordinates: coords },
            },
          };
        });
      });
    }
  };

  const handleLinkMatchCandidate = (cand: SurnameMatchCandidate) => {
    const parts = cand.fullName.trim().split(' ');
    const firstName = parts.slice(0, -1).join(' ') || cand.fullName;
    const lastName = parts[parts.length - 1] || '';
    handleAddRelative({
      anchorId: cand.suggestedAnchorId,
      relationType: cand.suggestedRelation,
      firstName,
      lastName,
      gender: 'other',
      birthYear: cand.birthYear,
      deathYear: cand.deathYear,
      birthplace: cand.birthplace,
      occupation: cand.occupation,
      bioNote: `${cand.matchBasis}. Archive: ${cand.archiveSource}.`,
    });
  };

  const handleExportJson = () => {
    if (!tree) return;
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tree.profile.fullName.toLowerCase().replace(/\s+/g, '-')}-lineage-archive.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedPerson = tree?.nodes[selectedId] ?? null;

  const lineagePath = useMemo(() => {
    if (!tree || !selectedPerson) return null;
    return traceLineagePath(tree.nodes, tree.rootId, selectedPerson.id);
  }, [tree, selectedPerson]);

  const treeMetrics = useMemo(() => {
    if (!tree) return null;
    const list = Object.values(tree.nodes);
    const earliest = Math.min(...list.map((n) => n.birthYear));
    const maxGen = Math.max(...list.map((n) => n.generation));
    const uniquePlaces = new Set(list.map((n) => n.birthplace)).size;
    return {
      totalRelatives: list.length,
      generations: maxGen + 1,
      earliestYear: earliest,
      uniquePlaces,
    };
  }, [tree]);

  const allNodesList = useMemo(() => (tree ? Object.values(tree.nodes) : []), [tree]);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1C1917] flex flex-col">
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Header
        activeSection={activeSection}
        hasTree={Boolean(tree)}
        onNavigate={handleNavigate}
        onOpenAddRelative={() => {
          if (tree) setAddModalAnchorId(selectedId || tree.rootId);
        }}
      />

      {activeSection === 'intake' || !tree ? (
        <IntakeStage
          initialProfile={tree?.profile ?? SAMPLE_PROFILES[0].profile}
          onGenerateTree={handleGenerateTree}
          hasExistingTree={Boolean(tree)}
          onViewExistingTree={() => setActiveSection('pedigree')}
        />
      ) : (
        <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-5">
          {/* Workspace Sub-Header Summary & Mode Bar */}
          <section className="bg-white border border-[#E4DDD0] rounded-lg px-5 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-[#6B6257] flex flex-wrap items-center gap-2">
                <span>Focal Profile: {tree.profile.fullName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  DOB {tree.profile.dob} (Age {tree.profile.age})
                </span>
                <span aria-hidden="true">·</span>
                <span>{tree.profile.birthplace}</span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#1C1917] mt-0.5 truncate">
                {tree.nodes[tree.rootId].lastName} Extended Family &amp; Ancestral Lineage
              </h1>
            </div>

            {/* Key Counts & Actions */}
            <div className="flex flex-wrap items-center gap-5">
              {treeMetrics && (
                <div className="hidden xl:flex items-center gap-5 text-xs border-r border-[#E4DDD0] pr-5">
                  <div>
                    <div className="text-[#6B6257]">Relatives</div>
                    <div className="font-mono tabular-nums font-semibold text-[#1C1917]">
                      {treeMetrics.totalRelatives}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6B6257]">Generations</div>
                    <div className="font-mono tabular-nums font-semibold text-[#1C1917]">
                      {treeMetrics.generations}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6B6257]">Earliest Year</div>
                    <div className="font-mono tabular-nums font-semibold text-[#1C1917]">
                      {treeMetrics.earliestYear}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6B6257]">Origin Hubs</div>
                    <div className="font-mono tabular-nums font-semibold text-[#1C1917]">
                      {treeMetrics.uniquePlaces}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('intake')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#292524] bg-[#F6F2EA] border border-[#D6CEBE] rounded-md hover:bg-[#EAE3D5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#292524] bg-white border border-[#D6CEBE] rounded-md hover:bg-[#F3EFE7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>
          </section>

          {/* Interactive Visualization Stage + Archival Dossier Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 xl:col-span-9 min-w-0">
              {activeSection === 'pedigree' && (
                <PedigreeCanvas
                  tree={tree}
                  selectedId={selectedId}
                  lineagePath={lineagePath}
                  onSelectPerson={setSelectedId}
                />
              )}
              {activeSection === 'fan' && (
                <FanChartCanvas
                  tree={tree}
                  selectedId={selectedId}
                  onSelectPerson={setSelectedId}
                />
              )}
              {activeSection === 'timeline' && (
                <TimelineOriginsView
                  tree={tree}
                  selectedId={selectedId}
                  mapsApiKey={mapsApiKey}
                  onSelectPerson={setSelectedId}
                />
              )}
              {activeSection === 'kinship' && (
                <KinshipLabView
                  tree={tree}
                  selectedId={selectedId}
                  compareTargetId={compareTargetId}
                  onSelectPerson={setSelectedId}
                  onLinkMatchCandidate={handleLinkMatchCandidate}
                />
              )}
            </div>

            <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20">
              <PersonInspector
                person={selectedPerson}
                rootId={tree.rootId}
                lineagePath={lineagePath}
                onSelectPerson={setSelectedId}
                onUpdatePerson={handleUpdatePerson}
                onOpenAddRelativeFor={(anchorId) => setAddModalAnchorId(anchorId)}
                onCompareInKinshipLab={(personId) => {
                  setCompareTargetId(personId);
                  setActiveSection('kinship');
                }}
              />
            </div>
          </div>
        </main>
      )}

      {tree && addModalAnchorId && (
        <AddRelativeModal
          isOpen={Boolean(addModalAnchorId)}
          anchorPerson={tree.nodes[addModalAnchorId] || tree.nodes[tree.rootId]}
          allNodes={allNodesList}
          onClose={() => setAddModalAnchorId(null)}
          onAddRelative={handleAddRelative}
        />
      )}
    </div>
  );
}
