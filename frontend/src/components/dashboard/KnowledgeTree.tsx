import { useMemo, useState } from 'react';
import type { Chunk } from '@/lib/types';

const W = 1000;
const H = 680;

// Deterministic hash → [0, 1)
function hx(n: number): number {
  let t = (((n >>> 0) * 0x9e3779b9) >>> 0);
  t = (((t ^ (t >>> 16)) * 0x85ebca6b) >>> 0);
  t = (((t ^ (t >>> 13)) * 0xc2b2ae35) >>> 0);
  return ((t ^ (t >>> 16)) >>> 0) / 0xffffffff;
}

interface Seg { path: string; w: number; depth: number }

function buildBranches(
  x: number, y: number, angle: number, len: number, w: number,
  depth: number, maxDepth: number, seed: number,
  segs: Seg[], terminals: { x: number; y: number }[],
): void {
  if (depth > maxDepth || len < 5) return;

  const nx = x + len * Math.sin(angle);
  const ny = y - len * Math.cos(angle);
  const bow = (hx(seed + 1) - 0.5) * len * 0.22;
  const cpx = (x + nx) / 2 + bow * Math.cos(angle + Math.PI / 2);
  const cpy = (y + ny) / 2 + bow * Math.sin(angle + Math.PI / 2);

  segs.push({
    path: `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`,
    w,
    depth,
  });

  if (depth === maxDepth) { terminals.push({ x: nx, y: ny }); return; }

  const nk = depth < maxDepth - 1 ? 3 : 2;
  const aOff = nk === 3 ? [-0.50, -0.04, 0.42] : [-0.46, 0.38];
  const lS   = nk === 3 ? [0.72,  0.77,  0.70]  : [0.73,  0.70];
  const wS   = nk === 3 ? [0.64,  0.70,  0.62]  : [0.65,  0.61];

  for (let i = 0; i < nk; i++) {
    buildBranches(
      nx, ny,
      angle + aOff[i] + (hx(seed * 17 + i * 31) - 0.5) * 0.10,
      len * lS[i], w * wS[i],
      depth + 1, maxDepth,
      seed * 7 + i * 13 + depth * 3,
      segs, terminals,
    );
  }
}

function leafColor(r: number): string {
  if (r >= 0.75) return '#22c55e';
  if (r >= 0.60) return '#86efac';
  if (r >= 0.45) return '#eab308';
  if (r >= 0.25) return '#f97316';
  if (r >= 0.10) return '#ef4444';
  return '#7f1d1d';
}

const BRANCH_COLS = ['#100704', '#1c0e08', '#2c1a0c', '#3e2616', '#503420', '#62422c'];

interface LeafEntry { x: number; y: number; rot: number; chunk: Chunk | null }

function buildLeaves(
  terminals: { x: number; y: number }[],
  lpn: number,
  chunks: Chunk[],
): LeafEntry[] {
  const slots: { x: number; y: number; rot: number }[] = [];
  terminals.forEach((t, ti) => {
    for (let i = 0; i < lpn; i++) {
      const theta = (i / lpn) * Math.PI * 2 + hx(ti * 500 + 1) * Math.PI;
      const r = 9 + hx(ti * 100 + i * 37) * 11;
      slots.push({
        x: t.x + r * Math.cos(theta),
        y: t.y + r * Math.sin(theta),
        rot: (hx(ti * 200 + i * 73) - 0.5) * 110,
      });
    }
  });
  slots.sort((a, b) => a.y - b.y);
  const ranked = [...chunks].sort((a, b) => (b.retention ?? 0) - (a.retention ?? 0));
  return slots.map((s, i) => ({ ...s, chunk: i < ranked.length ? ranked[i] : null }));
}

function applyDecay(chunks: Chunk[], offsetH: number): Chunk[] {
  if (offsetH <= 0) return chunks;
  const exp = 1 + offsetH / 720;
  return chunks.map(c => ({ ...c, retention: Math.max(0, ((c.retention ?? 0.5) ** exp)) }));
}

function treeParams(n: number): [number, number, number, number] {
  if (n <  30) return [2, 3,  68, 16];
  if (n <  80) return [3, 3,  90, 20];
  if (n < 170) return [4, 3, 108, 24];
  return [5, 2, 120, 28];
}

// Leaf SVG path (stem at 0,0; tip points up)
const LP = 'M 0 0 C -4 -5 -4 -11 0 -14 C 4 -11 4 -5 0 0 Z';
const LV = 'M 0 -1 L 0 -13';

interface Props {
  chunks: Chunk[];
  timeOffsetHours?: number;
  onLeafClick: (c: Chunk) => void;
  selectedId?: string;
  className?: string;
}

export function KnowledgeTree({ chunks, timeOffsetHours = 0, onLeafClick, selectedId, className }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [maxD, lpn, startLen, startW] = treeParams(chunks.length);

  const { segs, leaves } = useMemo(() => {
    const segs: Seg[] = [];
    const terminals: { x: number; y: number }[] = [];
    buildBranches(W / 2, H - 52, 0.04, startLen, startW, 0, maxD, 42, segs, terminals);
    const adj = applyDecay(chunks, timeOffsetHours);
    return { segs, leaves: buildLeaves(terminals, lpn, adj) };
  }, [chunks, maxD, lpn, startLen, startW, timeOffsetHours]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`select-none ${className ?? 'w-full h-full'}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="tbg" cx="50%" cy="35%" r="70%">
          <stop offset="0%"   stopColor="#0d0822" />
          <stop offset="65%"  stopColor="#060510" />
          <stop offset="100%" stopColor="#020108" />
        </radialGradient>
        <radialGradient id="gfog" cx="50%" cy="100%" r="55%">
          <stop offset="0%"   stopColor="rgba(42,18,8,0.75)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="lg">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>
      </defs>

      {/* Sky */}
      <rect x={0} y={0} width={W} height={H} fill="url(#tbg)" />
      <ellipse cx={W / 2} cy={H} rx={W * 0.55} ry={230} fill="url(#gfog)" />

      {/* Atmospheric stars */}
      {Array.from({ length: 40 }, (_, i) => (
        <circle
          key={i}
          cx={hx(i * 1337) * W}
          cy={hx(i * 2473) * H * 0.55}
          r={hx(i * 999) * 1.2 + 0.3}
          fill="white"
          opacity={hx(i * 777) * 0.4 + 0.1}
        />
      ))}

      {/* Ground */}
      <ellipse cx={W / 2} cy={H - 18} rx={175} ry={30} fill="rgba(0,0,0,0.65)" />

      {/* Root hints */}
      {([-1, 1] as const).map((side) => (
        <path
          key={side}
          d={`M ${W/2 + side * 22} ${H - 36} C ${W/2 + side * 90} ${H - 58} ${W/2 + side * 160} ${H - 42} ${W/2 + side * 200} ${H - 22}`}
          stroke="#241006" strokeWidth="8" fill="none" strokeLinecap="round"
        />
      ))}

      {/* Branches — back-to-front (by depth) */}
      {segs.map((s, i) => (
        <path
          key={i}
          d={s.path}
          stroke={BRANCH_COLS[Math.min(s.depth, BRANCH_COLS.length - 1)]}
          strokeWidth={s.w}
          fill="none"
          strokeLinecap="round"
        />
      ))}

      {/* Leaves */}
      {leaves.map((leaf, i) => {
        if (!leaf.chunk) return null;
        const r   = leaf.chunk.retention ?? 0.5;
        const col = leafColor(r);
        const isSel  = leaf.chunk.id === selectedId;
        const isHov  = leaf.chunk.id === hoverId;
        const fallen = r < 0.08 && timeOffsetHours > 0;
        const fallY  = fallen ? 25 + hx(i * 777) * 55 : 0;
        const sc     = isSel ? 2.1 : isHov ? 1.7 : 1.0 + r * 0.28;
        const opa    = fallen ? 0.22 : r < 0.15 ? 0.42 : 0.88;

        return (
          <g
            key={i}
            transform={`translate(${leaf.x.toFixed(1)},${(leaf.y + fallY).toFixed(1)}) rotate(${leaf.rot.toFixed(1)}) scale(${sc.toFixed(2)})`}
            onClick={() => onLeafClick(leaf.chunk!)}
            onMouseEnter={() => setHoverId(leaf.chunk!.id)}
            onMouseLeave={() => setHoverId(null)}
            style={{ cursor: 'pointer', opacity: opa, transition: 'opacity 0.4s ease' }}
          >
            <path
              d={LP}
              fill={col}
              stroke={isSel ? '#fff' : 'rgba(0,0,0,0.2)'}
              strokeWidth={isSel ? 1 : 0.5}
              filter={r > 0.6 ? 'url(#lg)' : undefined}
            />
            <path d={LV} stroke="rgba(0,0,0,0.22)" strokeWidth={0.6} fill="none" />
            {isSel && (
              <circle cx={0} cy={-7} r={12} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
            )}
          </g>
        );
      })}

      {/* Hint text */}
      <text
        x={W / 2} y={H - 5}
        textAnchor="middle"
        fill="rgba(148,163,184,0.25)"
        fontSize="11"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="500"
        letterSpacing="1"
      >
        {leaves.filter(l => l.chunk).length} leaves · click to inspect
      </text>
    </svg>
  );
}
