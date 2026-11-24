import React, { useMemo, useState } from 'react';
import { FamilyTreeData, PersonNode } from '../types/genealogy';

interface FanChartCanvasProps {
  tree: FamilyTreeData;
  selectedId: string;
  onSelectPerson: (id: string) => void;
}

interface FanSector {
  ahn: number;
  gen: number;
  node: PersonNode | null;
  startAngle: number;
  endAngle: number;
  innerR: number;
  outerR: number;
  fill: string;
  hoverFill: string;
  textColor: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArcWedge(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
) {
  const p1 = polarToCartesian(cx, cy, outerR, startAngle);
  const p2 = polarToCartesian(cx, cy, outerR, endAngle);
  const p3 = polarToCartesian(cx, cy, innerR, endAngle);
  const p4 = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

export const FanChartCanvas: React.FC<FanChartCanvasProps> = ({
  tree,
  selectedId,
  onSelectPerson,
}) => {
  const [fanAngle, setFanAngle] = useState<180 | 360>(180);
  const [maxGen, setMaxGen] = useState<4 | 5>(4);
  const [colorMode, setColorMode] = useState<'branch' | 'era'>('branch');
  const [hoveredAhn, setHoveredAhn] = useState<number | null>(null);

  const cx = 420;
  const cy = fanAngle === 180 ? 450 : 380;

  const getSectorColors = (node: PersonNode | null, ahn: number, gen: number) => {
    if (!node) {
      return { fill: '#F3EFE7', hoverFill: '#EAE3D5', textColor: '#A8A29E' };
    }
    if (colorMode === 'branch') {
      const isPaternal = ahn < Math.pow(2, gen) + Math.pow(2, gen - 1);
      if (isPaternal) {
        const shades = ['#DCE5F5', '#E5ECF8', '#EDF2FA', '#F4F7FC', '#F8FAFD'];
        return {
          fill: shades[Math.min(gen - 1, shades.length - 1)],
          hoverFill: '#C7D6EE',
          textColor: '#1E3A8A',
        };
      }
      const mShades = ['#DCEAE0', '#E5F0E8', '#EDF5EF', '#F4F9F5', '#F8FBF9'];
      return {
        fill: mShades[Math.min(gen - 1, mShades.length - 1)],
        hoverFill: '#C5DEC9',
        textColor: '#14532D',
      };
    }

    // Era coloring
    if (node.birthYear >= 1940) {
      return { fill: '#F3EFE7', hoverFill: '#E5DEC9', textColor: '#1C1917' };
    }
    if (node.birthYear >= 1895) {
      return { fill: '#EAE2D2', hoverFill: '#DCD1BA', textColor: '#44403C' };
    }
    return { fill: '#DFD4BE', hoverFill: '#CEBFA2', textColor: '#292524' };
  };

  const sectors = useMemo(() => {
    const list: FanSector[] = [];
    const ringThickness = fanAngle === 180 ? 72 : 58;
    const baseRadius = 62;
    const totalSpan = fanAngle === 180 ? 200 : 359.6; // slightly open 200° arch for readable half-fan
    const startOffset = fanAngle === 180 ? -100 : -180;

    for (let gen = 1; gen <= maxGen; gen++) {
      const count = Math.pow(2, gen);
      const innerR = baseRadius + (gen - 1) * ringThickness;
      const outerR = innerR + ringThickness - 2;
      const anglePer = totalSpan / count;

      for (let i = 0; i < count; i++) {
        const ahn = count + i;
        const node = tree.nodes[`ahn-${ahn}`] || null;
        // Skip empty Gen 5 cells so only documented 3rd great-grandparents render cleanly
        if (gen === 5 && !node) continue;

        const startAngle = startOffset + i * anglePer;
        const endAngle = startAngle + anglePer - 0.35;
        const colors = getSectorColors(node, ahn, gen);
        list.push({
          ahn,
          gen,
          node,
          startAngle,
          endAngle,
          innerR,
          outerR,
          ...colors,
        });
      }
    }
    return list;
  }, [tree, fanAngle, maxGen, colorMode]);

  const activeAhn = hoveredAhn ?? tree.nodes[selectedId]?.ahnentafel ?? null;

  // Compute ancestor/descendant highlight chain for hovered/selected sector
  const highlightedAhns = useMemo(() => {
    const set = new Set<number>();
    if (!activeAhn) return set;
    let curr = activeAhn;
    while (curr >= 1) {
      set.add(curr);
      curr = Math.floor(curr / 2);
    }
    return set;
  }, [activeAhn]);

  const rootNode = tree.nodes[tree.rootId];
  const inspectedHoverNode = activeAhn ? tree.nodes[`ahn-${activeAhn}`] : null;
  const svgHeight = fanAngle === 180 ? 520 : 760;

  return (
    <div className="bg-white border border-[#E4DDD0] rounded-lg overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-3 bg-[#F6F2EA] border-b border-[#E4DDD0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#EAE3D5] rounded-md">
            <button
              type="button"
              onClick={() => setFanAngle(180)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                fanAngle === 180 ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
              }`}
            >
              Half-Fan Arch
            </button>
            <button
              type="button"
              onClick={() => setFanAngle(360)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                fanAngle === 360 ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
              }`}
            >
              Full Circle
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#EAE3D5] rounded-md">
            <button
              type="button"
              onClick={() => setColorMode('branch')}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                colorMode === 'branch' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
              }`}
            >
              Color by Branch
            </button>
            <button
              type="button"
              onClick={() => setColorMode('era')}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                colorMode === 'era' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
              }`}
            >
              Color by Era
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#EAE3D5] rounded-md">
          <button
            type="button"
            onClick={() => setMaxGen(4)}
            className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
              maxGen === 4 ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            4 Generations
          </button>
          <button
            type="button"
            onClick={() => setMaxGen(5)}
            className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
              maxGen === 5 ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            5 Generations
          </button>
        </div>
      </div>

      {/* Live Hover / Selected Sector Readout */}
      <div className="px-4 py-2 bg-[#FBF9F5] border-b border-[#EFE9DD] flex flex-wrap items-center justify-between gap-2 text-xs min-h-[36px]">
        {inspectedHoverNode ? (
          <>
            <div className="flex items-center gap-2 text-[#1C1917]">
              <span className="font-serif font-semibold">
                {inspectedHoverNode.firstName} {inspectedHoverNode.lastName}
              </span>
              <span className="text-[#A8A29E]" aria-hidden="true">·</span>
              <span className="text-[#57534E]">{inspectedHoverNode.relationshipLabel}</span>
              <span className="text-[#A8A29E]" aria-hidden="true">·</span>
              <span className="text-[#57534E]">{inspectedHoverNode.birthplace}</span>
            </div>
            <span className="font-mono tabular-nums text-[#6B6257]">
              {inspectedHoverNode.birthYear}–{inspectedHoverNode.deathYear ?? 'Present'} · Ahnentafel #{inspectedHoverNode.ahnentafel}
            </span>
          </>
        ) : (
          <span className="text-[#6B6257]">
            Hover or click any concentric wedge to trace an ancestral line back to {rootNode.firstName}.
          </span>
        )}
      </div>

      {/* SVG Radial Fan Stage */}
      <div className="w-full overflow-x-auto bg-[#FBF9F5] flex justify-center py-4">
        <svg
          viewBox={`0 0 840 ${svgHeight}`}
          className="w-full max-w-[840px] h-auto select-none"
          role="img"
          aria-label="Concentric radial ancestral fan chart"
        >
          {/* Sectors */}
          {sectors.map((sec) => {
            const isSelected = sec.node && sec.node.id === selectedId;
            const isChain = highlightedAhns.has(sec.ahn);
            const pathD = describeArcWedge(
              cx,
              cy,
              sec.innerR,
              sec.outerR,
              sec.startAngle,
              sec.endAngle
            );

            const midAngle = (sec.startAngle + sec.endAngle) / 2;
            const midR = (sec.innerR + sec.outerR) / 2;
            const labelPos = polarToCartesian(cx, cy, midR, midAngle);

            // Rotate text tangentially for readable outer rings
            let textRot = midAngle;
            if (fanAngle === 360 && midAngle > 90 && midAngle < 270) {
              textRot = midAngle + 180;
            } else if (fanAngle === 360 && midAngle < -90) {
              textRot = midAngle + 180;
            }
            if (sec.gen >= 4) {
              textRot = midAngle - 90;
              if (midAngle > 0 && midAngle < 180 && fanAngle === 360) textRot = midAngle - 90;
            }

            return (
              <g
                key={sec.ahn}
                onMouseEnter={() => setHoveredAhn(sec.ahn)}
                onMouseLeave={() => setHoveredAhn(null)}
                onClick={() => sec.node && onSelectPerson(sec.node.id)}
                className={sec.node ? 'cursor-pointer' : 'cursor-default'}
              >
                <path
                  d={pathD}
                  fill={isSelected || hoveredAhn === sec.ahn ? sec.hoverFill : sec.fill}
                  stroke={isSelected ? '#1E3A8A' : isChain ? '#854D0E' : '#FFFFFF'}
                  strokeWidth={isSelected ? 2.2 : isChain ? 1.5 : 1.2}
                  opacity={highlightedAhns.size > 0 && !isChain ? 0.55 : 1}
                />
                {sec.node && (
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${textRot}, ${labelPos.x}, ${labelPos.y})`}
                    fill={sec.textColor}
                    className="pointer-events-none"
                    style={{
                      fontSize: sec.gen <= 2 ? '11px' : sec.gen === 3 ? '9.5px' : '8px',
                      fontWeight: isSelected || sec.gen <= 2 ? 600 : 500,
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                    }}
                  >
                    {sec.gen <= 2
                      ? `${sec.node.firstName} ${sec.node.lastName}`
                      : sec.gen === 3
                      ? `${sec.node.firstName.slice(0, 1)}. ${sec.node.lastName}`
                      : sec.node.lastName}
                  </text>
                )}
              </g>
            );
          })}

          {/* Center Root Disc (You) */}
          <g
            onClick={() => onSelectPerson(rootNode.id)}
            onMouseEnter={() => setHoveredAhn(1)}
            onMouseLeave={() => setHoveredAhn(null)}
            className="cursor-pointer"
          >
            <circle
              cx={cx}
              cy={cy}
              r={58}
              fill={selectedId === rootNode.id ? '#1E3A8A' : '#F0F4FA'}
              stroke="#1E3A8A"
              strokeWidth={2}
            />
            <text
              x={cx}
              y={cy - 7}
              textAnchor="middle"
              fill={selectedId === rootNode.id ? '#FFFFFF' : '#1C1917'}
              style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Fraunces, serif' }}
            >
              {rootNode.firstName}
            </text>
            <text
              x={cx}
              y={cy + 9}
              textAnchor="middle"
              fill={selectedId === rootNode.id ? '#DBEAFE' : '#57534E'}
              style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace' }}
            >
              b. {rootNode.birthYear}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
