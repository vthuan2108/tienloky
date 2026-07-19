/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GardenPlant } from '../types';
import { SPIRITUAL_SEEDS } from '../data';
import { Trash2, Sprout } from 'lucide-react';
import { motion } from 'motion/react';

interface SpiritualGardenProps {
  plants: GardenPlant[];
  onClearGarden: () => void;
}

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Isometric projection helpers
const GRID = 5; // 5x5 Grid as per original Forest app style
const TW = 32;  // tile width (half the diamond width)
const TH = 16;  // tile height (half of TW for 2:1 aspect)
const SOIL = 18; // height of soil faces

// Convert grid (col, row) to SVG screen coordinates with +GRID shift to avoid negative X coordinates
function iso(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row + GRID) * TW,
    y: (col + row) * TH,
  };
}

function pts(...coords: Array<{ x: number; y: number }>): string {
  return coords.map(p => `${p.x},${p.y}`).join(' ');
}

// Draw a single grass tile (rhombus) with a checkerboard grass pattern
function GrassTile({ col, row }: { col: number; row: number }) {
  const tl = iso(col, row);
  const tr = iso(col + 1, row);
  const br = iso(col + 1, row + 1);
  const bl = iso(col, row + 1);
  
  // alternating colors for checkerboard look like Forest app
  const isAlt = (col + row) % 2 === 0;
  const fill = isAlt ? '#9ee847' : '#8cd132';

  return (
    <polygon
      points={pts(tl, tr, br, bl)}
      fill={fill}
      stroke="#82c030"
      strokeWidth="0.5"
    />
  );
}

// Isometric pine tree standing on a tile (styled to match the reference image tree)
interface IsoTreeProps {
  col: number;
  row: number;
  icon: string;
  delay: number;
}
function IsoTree({ col, row, icon, delay }: IsoTreeProps) {
  const center = iso(col + 0.5, row + 0.5);
  const cx = center.x;
  const cy = center.y;

  return (
    <motion.g
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 18 }}
      style={{ transformOrigin: `${cx}px ${cy + 2}px`, transformBox: 'fill-box' }}
    >
      {/* Ground shadow ellipse */}
      <ellipse cx={cx} cy={cy + 2} rx={8} ry={3.5} fill="rgba(0,0,0,0.22)" />
      {/* Trunk */}
      <rect x={cx - 1.5} y={cy - 6} width={3} height={9} fill="#854d0e" />
      {/* Bottom canopy tier */}
      <polygon
        points={`${cx - 11},${cy - 5} ${cx + 11},${cy - 5} ${cx},${cy - 20}`}
        fill="#22c55e"
      />
      {/* Mid canopy tier */}
      <polygon
        points={`${cx - 8},${cy - 16} ${cx + 8},${cy - 16} ${cx},${cy - 29}`}
        fill="#4ade80"
      />
      {/* Top canopy tier */}
      <polygon
        points={`${cx - 5},${cy - 25} ${cx + 5},${cy - 25} ${cx},${cy - 37}`}
        fill="#86efac"
      />
      {/* Highlight overlay on the right face of the tree to create 3D shading */}
      <polygon
        points={`${cx},${cy - 37} ${cx + 5},${cy - 25} ${cx},${cy - 25}`}
        fill="rgba(255,255,255,0.12)"
      />
      <polygon
        points={`${cx},${cy - 29} ${cx + 8},${cy - 16} ${cx},${cy - 16}`}
        fill="rgba(255,255,255,0.12)"
      />
      <polygon
        points={`${cx},${cy - 20} ${cx + 11},${cy - 5} ${cx},${cy - 5}`}
        fill="rgba(255,255,255,0.12)"
      />
      {/* The plant emoji label */}
      {icon !== '🌲' && (
        <text
          x={cx}
          y={cy - 41}
          textAnchor="middle"
          fontSize="9"
          style={{ userSelect: 'none', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))' }}
        >
          {icon}
        </text>
      )}
    </motion.g>
  );
}

export default function SpiritualGarden({ plants, onClearGarden }: SpiritualGardenProps) {
  const [filter, setFilter] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK');

  // Filter plants based on selection
  const filteredPlants = plants.filter(plant => {
    const today = new Date();
    const plantDate = new Date(plant.harvestedAt);
    const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const plantReset = new Date(plantDate.getFullYear(), plantDate.getMonth(), plantDate.getDate());
    const diffDays = Math.round((todayReset.getTime() - plantReset.getTime()) / (1000 * 60 * 60 * 24));

    if (filter === 'DAY') return plant.harvestedAt === getLocalDateString();
    if (filter === 'WEEK') return diffDays >= 0 && diffDays <= 7;
    if (filter === 'MONTH') return plant.harvestedAt.startsWith(getLocalDateString().slice(0, 7));
    return true;
  });

  const harvestedCount = filteredPlants.filter(p => p.status === 'HARVESTED').length;

  // Sort cells from center outward (so plants fill from center)
  const cx = (GRID - 1) / 2;
  const cy = (GRID - 1) / 2;
  const sortedCells: { r: number; c: number }[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      sortedCells.push({ r, c });
    }
  }
  sortedCells.sort((a, b) => {
    const da = Math.abs(a.r - cy) + Math.abs(a.c - cx);
    const db = Math.abs(b.r - cy) + Math.abs(b.c - cx);
    return da !== db ? da - db : a.r !== b.r ? a.r - b.r : a.c - b.c;
  });

  // Assign plants to cells based on sorted order
  const occupiedCells: { r: number; c: number; plant: GardenPlant }[] = [];
  sortedCells.forEach((cell, idx) => {
    if (idx < filteredPlants.length) {
      occupiedCells.push({ r: cell.r, c: cell.c, plant: filteredPlants[idx] });
    }
  });

  // Sort occupied cells back-to-front (smaller r + c first) to solve depth sorting overlap issues
  const renderedPlants = [...occupiedCells].sort((a, b) => {
    const sumA = a.r + a.c;
    const sumB = b.r + b.c;
    if (sumA !== sumB) return sumA - sumB;
    return a.c - b.c;
  });

  const getDateRangeLabel = () => {
    const today = new Date();
    if (filter === 'DAY') return `${today.toLocaleDateString('vi-VN')} (Hôm Nay)`;
    if (filter === 'WEEK') {
      const ago = new Date(); ago.setDate(today.getDate() - 7);
      return `${ago.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })} – ${today.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return `Tháng ${today.getMonth() + 1}/${today.getFullYear()}`;
  };

  // SVG bounding box setup
  const offsetX = 20;
  const svgW = GRID * 2 * TW + 2 * offsetX;
  const offsetY = 50;
  const svgH = GRID * 2 * TH + SOIL + 65;

  // Front-Left Faces (from Left tip (0, GRID) to Bottom tip (GRID, GRID))
  // row = GRID is constant, col ranges from 0 to GRID - 1
  const frontLeftFaces: Array<[{x:number;y:number},{x:number;y:number},{x:number;y:number},{x:number;y:number}]> = [];
  for (let c = 0; c < GRID; c++) {
    const top1 = iso(c, GRID);
    const top2 = iso(c + 1, GRID);
    frontLeftFaces.push([
      top1,
      top2,
      { x: top2.x, y: top2.y + SOIL },
      { x: top1.x, y: top1.y + SOIL },
    ]);
  }

  // Front-Right Faces (from Bottom tip (GRID, GRID) to Right tip (GRID, 0))
  // col = GRID is constant, row ranges from 0 to GRID - 1
  const frontRightFaces: Array<[{x:number;y:number},{x:number;y:number},{x:number;y:number},{x:number;y:number}]> = [];
  for (let r = 0; r < GRID; r++) {
    const top1 = iso(GRID, r);
    const top2 = iso(GRID, r + 1);
    frontRightFaces.push([
      top1,
      top2,
      { x: top2.x, y: top2.y + SOIL },
      { x: top1.x, y: top1.y + SOIL },
    ]);
  }

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3 font-sans" id="spiritual-garden">

      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-emerald-400 animate-pulse" />
          <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">🌿 Linh Viên</h3>
        </div>
        {plants.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Đạo hữu có chắc chắn muốn dọn sạch Linh Viên?')) onClearGarden();
            }}
            className="flex items-center gap-1 px-2 py-1 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            DỌN VƯỜN
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-950/60 border border-slate-900 p-0.5 rounded-xl text-[10px] font-extrabold">
        {(['DAY', 'WEEK', 'MONTH'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
              filter === t ? 'bg-slate-900 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            {t === 'DAY' ? 'Ngày' : t === 'WEEK' ? 'Tuần' : 'Tháng'}
          </button>
        ))}
      </div>
      <div className="text-center font-mono text-[9px] text-slate-500">{getDateRangeLabel()}</div>

      {/* ── SVG Isometric Garden ── */}
      <div className="flex justify-center overflow-hidden">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`${-offsetX} ${-offsetY} ${svgW} ${svgH}`}
          style={{ overflow: 'visible', maxWidth: '100%', height: 'auto' }}
        >
          {/* ── GRASS TILES (rendered back to front for correct overlap) ── */}
          {Array.from({ length: GRID }, (_, r) =>
            Array.from({ length: GRID }, (_, c) => (
              <GrassTile key={`${r}-${c}`} col={c} row={r} />
            ))
          )}

          {/* ── FRONT-LEFT SOIL FACE (facing viewer) ── */}
          {frontLeftFaces.map(([a, b, c, d], i) => (
            <polygon
              key={`flsoil-${i}`}
              points={pts(a, b, c, d)}
              fill={i % 2 === 0 ? '#854d0e' : '#713f12'}
              stroke="#541b05"
              strokeWidth="0.5"
            />
          ))}

          {/* ── FRONT-RIGHT SOIL FACE (facing viewer) ── */}
          {frontRightFaces.map(([a, b, c, d], i) => (
            <polygon
              key={`frsoil-${i}`}
              points={pts(a, b, c, d)}
              fill={i % 2 === 0 ? '#451a03' : '#3f1a01'}
              stroke="#3a1100"
              strokeWidth="0.5"
            />
          ))}

          {/* ── PLANTS (rendered in correct depth-sorted Z-order) ── */}
          {renderedPlants.map((cell, idx) => {
            const isHarvested = cell.plant.status === 'HARVESTED';
            const seed = SPIRITUAL_SEEDS.find(s => s.name === cell.plant.name);

            if (isHarvested) {
              return (
                <IsoTree
                  key={`tree-${cell.r}-${cell.c}-${cell.plant.name}`}
                  col={cell.c}
                  row={cell.r}
                  icon={seed?.icon || '🌲'}
                  delay={idx * 0.05}
                />
              );
            }
            // Withered plant — wilted icon
            const center = iso(cell.c + 0.5, cell.r + 0.5);
            return (
              <motion.text
                key={`dead-${cell.r}-${cell.c}`}
                x={center.x}
                y={center.y - 5}
                textAnchor="middle"
                fontSize="14"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                transition={{ delay: idx * 0.04 }}
                style={{ userSelect: 'none' }}
              >
                🥀
              </motion.text>
            );
          })}
        </svg>
      </div>

      {/* Footer count */}
      <div className="text-center font-mono text-[10px] border-t border-slate-900/60 pt-3 text-slate-400 italic">
        Đạo hữu đã trồng được{' '}
        <span className="text-emerald-400 font-bold font-sans">{harvestedCount}</span> gốc linh thảo.
      </div>
    </div>
  );
}
