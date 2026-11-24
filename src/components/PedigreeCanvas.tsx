import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Focus, Maximize2, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { FamilyTreeData, LineagePathResult, PersonNode, TreeBranchFilter } from '../types/genealogy';

interface PedigreeCanvasProps {
  tree: FamilyTreeData;
  selectedId: string;
  lineagePath: LineagePathResult | null;
  onSelectPerson: (id: string) => void;
}

interface PositionedNode {
  node: PersonNode;
  x: number;
  y: number;
}

interface TreeEdge {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'parent' | 'spouse';
  branch: PersonNode['branch'];
}

const NODE_W = 204;
const NODE_H = 74;
const COL_STEP = 276;
const BASE_Y_GAP = 94;

export const PedigreeCanvas: React.FC<PedigreeCanvasProps> = ({
  tree,
  selectedId,
  lineagePath,
  onSelectPerson,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [branchFilter, setBranchFilter] = useState<TreeBranchFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(0.78);
  const [pan, setPan] = useState({ x: 36, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Compute deterministic non-overlapping layout coordinates
  const { positioned, edges, bounds } = useMemo(() => {
    const nodes = Object.values(tree.nodes);
    const posMap: Record<string, { x: number; y: number }> = {};

    // Check if there are any Gen -1 nodes (children of user)
    const minGen = Math.min(0, ...nodes.map((n) => n.generation));
    const genToX = (gen: number) => (gen - minGen) * COL_STEP + 40;

    // 1. Place Gen 4 Ahnentafel (16..31) evenly first to anchor binary symmetry
    const gen4Count = 16;
    const topMargin = 80;
    for (let i = 0; i < gen4Count; i++) {
      const ahn = 16 + i;
      const id = `ahn-${ahn}`;
      if (tree.nodes[id]) {
        posMap[id] = {
          x: genToX(4),
          y: topMargin + i * BASE_Y_GAP,
        };
      }
    }

    // 2. Place Gen 5 (32, 33) to the right of ahn-16
    if (tree.nodes['ahn-32'] && posMap['ahn-16']) {
      posMap['ahn-32'] = { x: genToX(5), y: posMap['ahn-16'].y - 44 };
    }
    if (tree.nodes['ahn-33'] && posMap['ahn-16']) {
      posMap['ahn-33'] = { x: genToX(5), y: posMap['ahn-16'].y + 44 };
    }

    // 3. Place Gen 3 -> Gen 2 -> Gen 1 -> Gen 0 (Self) as midpoints of parents
    for (let gen = 3; gen >= 0; gen--) {
      const start = Math.pow(2, gen);
      const end = Math.pow(2, gen + 1) - 1;
      for (let ahn = start; ahn <= end; ahn++) {
        const id = `ahn-${ahn}`;
        if (!tree.nodes[id]) continue;
        const fPos = posMap[`ahn-${ahn * 2}`];
        const mPos = posMap[`ahn-${ahn * 2 + 1}`];
        if (fPos && mPos) {
          posMap[id] = {
            x: genToX(gen),
            y: (fPos.y + mPos.y) / 2,
          };
        } else {
          posMap[id] = {
            x: genToX(gen),
            y: topMargin + (ahn - start) * BASE_Y_GAP * 2,
          };
        }
      }
    }

    // 4. Place Extended & Custom Nodes without overlapping existing nodes in the same column
    const isSlotFree = (x: number, y: number) => {
      return !Object.values(posMap).some(
        (p) => Math.abs(p.x - x) < NODE_W * 0.8 && Math.abs(p.y - y) < NODE_H + 16
      );
    };

    const findFreeY = (x: number, preferredY: number) => {
      if (isSlotFree(x, preferredY)) return preferredY;
      for (let step = 1; step < 30; step++) {
        const down = preferredY + step * (NODE_H + 18);
        if (isSlotFree(x, down)) return down;
        const up = preferredY - step * (NODE_H + 18);
        if (up >= 30 && isSlotFree(x, up)) return up;
      }
      return preferredY + 300;
    };

    // Place aunts/uncles near their parents' midpoint, siblings near self, cousins near aunts/uncles
    const remaining = nodes
      .filter((n) => !posMap[n.id])
      .sort((a, b) => b.generation - a.generation || a.birthYear - b.birthYear);

    for (const node of remaining) {
      const colX = genToX(node.generation);
      let preferredY = posMap[tree.rootId]?.y ?? 650;

      if (node.id === 'ext-uncle-pat' && posMap['ahn-2']) {
        preferredY = posMap['ahn-2'].y + 102;
      } else if (node.id === 'ext-aunt-mat' && posMap['ahn-3']) {
        preferredY = posMap['ahn-3'].y + 102;
      } else if (node.id.startsWith('ext-cousin-1') && posMap['ext-uncle-pat']) {
        preferredY = posMap['ext-uncle-pat'].y + 20;
      } else if (node.id.startsWith('ext-cousin-2') && posMap['ext-aunt-mat']) {
        preferredY = posMap['ext-aunt-mat'].y + 20;
      } else if (node.parentIds.length > 0 && posMap[node.parentIds[0]]) {
        preferredY = posMap[node.parentIds[0]].y + 94;
      } else if (node.childrenIds.length > 0 && posMap[node.childrenIds[0]]) {
        preferredY = posMap[node.childrenIds[0]].y;
      } else if (node.spouseIds.length > 0 && posMap[node.spouseIds[0]]) {
        preferredY = posMap[node.spouseIds[0]].y + 92;
      }

      posMap[node.id] = {
        x: colX,
        y: findFreeY(colX, preferredY),
      };
    }

    // Filter visibility by branchFilter
    const isVisible = (n: PersonNode) => {
      if (branchFilter === 'all') return true;
      if (branchFilter === 'direct') return n.ahnentafel !== null;
      if (branchFilter === 'paternal') return n.branch === 'self' || n.branch === 'paternal';
      if (branchFilter === 'maternal') return n.branch === 'self' || n.branch === 'maternal';
      if (branchFilter === 'extended') {
        return n.branch === 'self' || n.branch === 'extended' || n.generation <= 1;
      }
      return true;
    };

    const visibleNodes = nodes.filter(isVisible);
    const visibleSet = new Set(visibleNodes.map((n) => n.id));

    const positionedList: PositionedNode[] = visibleNodes.map((node) => ({
      node,
      x: posMap[node.id].x,
      y: posMap[node.id].y,
    }));

    // Build SVG edges
    const edgeList: TreeEdge[] = [];
    const seenSpousePairs = new Set<string>();

    for (const child of visibleNodes) {
      const cPos = posMap[child.id];
      for (const pid of child.parentIds) {
        if (!visibleSet.has(pid)) continue;
        const pPos = posMap[pid];
        edgeList.push({
          id: `p-${child.id}-${pid}`,
          fromId: child.id,
          toId: pid,
          x1: cPos.x + NODE_W,
          y1: cPos.y + NODE_H / 2,
          x2: pPos.x,
          y2: pPos.y + NODE_H / 2,
          kind: 'parent',
          branch: tree.nodes[pid].branch,
        });
      }

      for (const sid of child.spouseIds) {
        if (!visibleSet.has(sid)) continue;
        const pairKey = [child.id, sid].sort().join('--');
        if (seenSpousePairs.has(pairKey)) continue;
        seenSpousePairs.add(pairKey);
        const sPos = posMap[sid];
        // Only draw direct vertical/arc spouse link when same column (e.g. custom spouses or Gen 0)
        if (Math.abs(cPos.x - sPos.x) < 10 && Math.abs(cPos.y - sPos.y) < 140) {
          edgeList.push({
            id: `s-${pairKey}`,
            fromId: child.id,
            toId: sid,
            x1: cPos.x + NODE_W / 2,
            y1: cPos.y + (cPos.y < sPos.y ? NODE_H : 0),
            x2: sPos.x + NODE_W / 2,
            y2: sPos.y + (cPos.y < sPos.y ? 0 : NODE_H),
            kind: 'spouse',
            branch: 'extended',
          });
        }
      }
    }

    const maxX = Math.max(...positionedList.map((p) => p.x + NODE_W), 1200) + 100;
    const maxY = Math.max(...positionedList.map((p) => p.y + NODE_H), 900) + 80;

    return {
      positioned: positionedList,
      edges: edgeList,
      bounds: { width: maxX, height: maxY, minGen },
    };
  }, [tree, branchFilter]);

  const pathNodeIds = useMemo(() => {
    return new Set(lineagePath?.steps.map((s) => s.node.id) ?? []);
  }, [lineagePath]);

  const pathEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!lineagePath) return keys;
    for (let i = 0; i < lineagePath.steps.length - 1; i++) {
      const a = lineagePath.steps[i].node.id;
      const b = lineagePath.steps[i + 1].node.id;
      keys.add(`${a}--${b}`);
      keys.add(`${b}--${a}`);
    }
    return keys;
  }, [lineagePath]);

  const matchingIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      positioned
        .filter(({ node }) => {
          const hay = `${node.firstName} ${node.lastName} ${node.birthplace} ${node.occupation} ${node.relationshipLabel}`.toLowerCase();
          return hay.includes(q);
        })
        .map(({ node }) => node.id)
    );
  }, [searchQuery, positioned]);

  const focusOnNode = (id: string) => {
    const target = positioned.find((p) => p.node.id === id);
    if (!target || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const targetZoom = Math.max(zoom, 0.85);
    setZoom(targetZoom);
    setPan({
      x: rect.width / 2 - (target.x + NODE_W / 2) * targetZoom,
      y: rect.height / 2 - (target.y + NODE_H / 2) * targetZoom,
    });
  };

  const fitToScreen = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 48) / bounds.width;
    const scaleY = (rect.height - 48) / bounds.height;
    const nextZoom = Math.max(0.38, Math.min(0.95, Math.min(scaleX, scaleY)));
    setZoom(nextZoom);
    setPan({
      x: Math.max(20, (rect.width - bounds.width * nextZoom) / 2),
      y: 20,
    });
  };

  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.rootId, branchFilter]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button[data-node-card="true"]')) return;
    setIsDragging(true);
    dragOrigin.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: dragOrigin.current.panX + (e.clientX - dragOrigin.current.x),
      y: dragOrigin.current.panY + (e.clientY - dragOrigin.current.y),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => Math.max(0.35, Math.min(1.65, +(z + delta).toFixed(2))));
    }
  };

  const genColumns = useMemo(() => {
    const uniqueGens = Array.from(new Set(positioned.map((p) => p.node.generation))).sort((a, b) => a - b);
    return uniqueGens.map((gen) => ({
      gen,
      x: (gen - bounds.minGen) * COL_STEP + 40,
      label:
        gen === -1
          ? 'Children'
          : gen === 0
          ? 'Your Generation'
          : gen === 1
          ? 'Parents & Aunts/Uncles'
          : gen === 2
          ? 'Grandparents'
          : gen === 3
          ? 'Great-Grandparents'
          : gen === 4
          ? '2nd Great-Grandparents'
          : '3rd Great-Grandparents',
    }));
  }, [positioned, bounds.minGen]);

  return (
    <div className="bg-white border border-[#E4DDD0] rounded-lg overflow-hidden flex flex-col">
      {/* Workspace Toolbar */}
      <div className="px-4 py-3 bg-[#F6F2EA] border-b border-[#E4DDD0] flex flex-wrap items-center justify-between gap-3">
        {/* Branch Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#EAE3D5] rounded-md overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All Family' },
              { id: 'direct', label: 'Direct Ancestors' },
              { id: 'paternal', label: 'Paternal' },
              { id: 'maternal', label: 'Maternal' },
              { id: 'extended', label: 'Extended Kin' },
            ] as { id: TreeBranchFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBranchFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                branchFilter === tab.id
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-[#6B6257] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && matchingIds.size > 0) {
                  const first = Array.from(matchingIds)[0];
                  onSelectPerson(first);
                  focusOnNode(first);
                }
              }}
              placeholder="Find relative or place..."
              aria-label="Search relatives"
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D6CEBE] rounded-md w-48 focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>

          <div className="flex items-center border border-[#D6CEBE] rounded-md bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.12).toFixed(2)))}
              aria-label="Zoom out"
              className="p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3EFE7] cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <span className="px-2 text-[11px] font-mono tabular-nums text-[#292524] border-x border-[#E4DDD0]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.65, +(z + 0.12).toFixed(2)))}
              aria-label="Zoom in"
              className="p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3EFE7] cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectPerson(tree.rootId);
              focusOnNode(tree.rootId);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#292524] bg-white border border-[#D6CEBE] rounded-md hover:bg-[#F3EFE7] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Focus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Center Me</span>
          </button>

          <button
            type="button"
            onClick={fitToScreen}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#292524] bg-white border border-[#D6CEBE] rounded-md hover:bg-[#F3EFE7] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Fit All</span>
          </button>
        </div>
      </div>

      {/* Traced Lineage Breadcrumb Strip */}
      {lineagePath && selectedId !== tree.rootId && (
        <div className="px-4 py-2 bg-[#FBF9F5] border-b border-[#EFE9DD] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-[#44403C]">
            <span className="font-semibold text-[#1E3A8A]">Active Lineage Path:</span>
            {lineagePath.steps.map((step, idx) => (
              <React.Fragment key={step.node.id}>
                {idx > 0 && <span className="text-[#A8A29E]" aria-hidden="true">→</span>}
                <button
                  type="button"
                  onClick={() => {
                    onSelectPerson(step.node.id);
                    focusOnNode(step.node.id);
                  }}
                  className={`hover:underline cursor-pointer ${
                    idx === lineagePath.steps.length - 1 ? 'font-semibold text-[#1C1917]' : ''
                  }`}
                >
                  {step.node.firstName} {step.node.lastName}
                </button>
              </React.Fragment>
            ))}
          </div>
          <span className="font-mono tabular-nums text-[11px] text-[#6B6257]">
            {lineagePath.description} · ~{lineagePath.estimatedSharedLineagePct}% shared lineage
          </span>
        </div>
      )}

      {/* Interactive Pan/Zoom Stage */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`relative h-[640px] w-full overflow-hidden bg-[#FBF9F5] select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          backgroundImage: 'radial-gradient(#D6CEBE 0.85px, transparent 0.85px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: '0 0',
            width: bounds.width,
            height: bounds.height,
          }}
          className="relative transition-transform duration-75 ease-out"
        >
          {/* Generation Column Headers */}
          {genColumns.map((col) => (
            <div
              key={col.gen}
              style={{ left: col.x, top: 18, width: NODE_W }}
              className="absolute text-xs font-medium text-[#6B6257] pb-2 border-b border-[#E4DDD0] truncate"
            >
              {col.label}
            </div>
          ))}

          {/* SVG Connector Lines */}
          <svg
            width={bounds.width}
            height={bounds.height}
            className="absolute inset-0 pointer-events-none"
          >
            {edges.map((edge) => {
              const pairKey = `${edge.fromId}--${edge.toId}`;
              const isHighlighted = pathEdgeKeys.has(pairKey);
              const isDimmed = selectedId !== tree.rootId && pathEdgeKeys.size > 0 && !isHighlighted;

              const midX = (edge.x1 + edge.x2) / 2;
              const d =
                edge.kind === 'spouse'
                  ? `M ${edge.x1} ${edge.y1} L ${edge.x2} ${edge.y2}`
                  : `M ${edge.x1} ${edge.y1} C ${midX} ${edge.y1}, ${midX} ${edge.y2}, ${edge.x2} ${edge.y2}`;

              const strokeColor = isHighlighted
                ? '#1E3A8A'
                : edge.branch === 'paternal'
                ? '#93A3C4'
                : edge.branch === 'maternal'
                ? '#86A891'
                : '#C4B59B';

              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHighlighted ? 2.6 : 1.4}
                  strokeDasharray={edge.kind === 'spouse' ? '4 3' : undefined}
                  opacity={isDimmed ? 0.28 : 1}
                />
              );
            })}
          </svg>

          {/* Person Cards */}
          {positioned.map(({ node, x, y }) => {
            const isSelected = node.id === selectedId;
            const isOnPath = pathNodeIds.has(node.id);
            const isSearchMatch = matchingIds.has(node.id);
            const isDimmed =
              (searchQuery.trim().length > 0 && !isSearchMatch) ||
              (selectedId !== tree.rootId && pathNodeIds.size > 0 && !isOnPath);

            const branchTone =
              node.branch === 'self'
                ? 'border-[#1E3A8A] bg-[#F0F4FA]'
                : node.branch === 'paternal'
                ? 'border-[#CBD5E1] bg-white'
                : node.branch === 'maternal'
                ? 'border-[#CBD9CE] bg-white'
                : 'border-[#E4DDD0] bg-[#FAF6EE]';

            return (
              <button
                key={node.id}
                type="button"
                data-node-card="true"
                onClick={() => onSelectPerson(node.id)}
                style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
                className={`absolute text-left px-3.5 py-2.5 rounded-md border transition-all cursor-pointer flex flex-col justify-between ${branchTone} ${
                  isSelected
                    ? 'ring-2 ring-[#1E3A8A] border-[#1E3A8A] shadow-sm z-10'
                    : isSearchMatch
                    ? 'ring-2 ring-[#854D0E] border-[#854D0E] z-10'
                    : isOnPath
                    ? 'border-[#1E3A8A] z-10'
                    : 'hover:border-[#854D0E]'
                } ${isDimmed ? 'opacity-45' : 'opacity-100'}`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-[10px] font-medium text-[#6B6257] truncate">
                    {node.relationshipLabel}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-[#6B6257] shrink-0">
                    {node.birthYear}–{node.deathYear ?? 'Now'}
                  </span>
                </div>

                <div className="font-serif text-sm font-semibold text-[#1C1917] truncate w-full">
                  {node.firstName} {node.lastName}
                </div>

                <div className="text-[11px] text-[#57534E] truncate w-full">
                  {node.birthplace}
                </div>
              </button>
            );
          })}
        </div>

        {/* Subtle Legend Bar in Bottom Left */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-[#E4DDD0] rounded-md px-3 py-1.5 flex flex-wrap items-center gap-4 text-[11px] text-[#57534E]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#1E3A8A] inline-block" aria-hidden="true" />
            <span>Paternal / Traced Path</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#14532D] inline-block" aria-hidden="true" />
            <span>Maternal Line</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#854D0E] inline-block" aria-hidden="true" />
            <span>Extended Kin</span>
          </span>
          <span className="text-[#857D71] hidden sm:inline">Drag canvas to pan · Ctrl+Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
};
