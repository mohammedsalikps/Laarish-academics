import * as THREE from 'three';
import { lumpy, merge, paint, place, seeded, type Placement } from './clay';

/**
 * The six subject islands, built from simple clay shapes (wireframe page 3 and
 * page 11): a floating island on a round earthy base with 4–6 landmarks, each
 * with clear space around it for a chapter pin. Every island is one merged,
 * vertex-coloured geometry, so the whole hub costs a handful of draw calls.
 */

export type IslandStyle = 'science' | 'maths' | 'english' | 'hindi' | 'kannada' | 'social';

export interface IslandModel {
  geometry: THREE.BufferGeometry;
  /** Landmark anchors on the island (local coordinates, island radius 1.8). */
  anchors: THREE.Vector3[];
  /** Height of the walkable top surface. */
  top: number;
}

export const ISLAND_RADIUS = 1.8;
const TOP = 0.2;

type Parts = THREE.BufferGeometry[];

const box = (parts: Parts, w: number, h: number, d: number, color: string, p: Placement, shade = 0.15) =>
  parts.push(place(paint(new THREE.BoxGeometry(w, h, d), color, shade), p));
const cyl = (parts: Parts, rt: number, rb: number, h: number, color: string, p: Placement, seg = 14, shade = 0.18) =>
  parts.push(place(paint(new THREE.CylinderGeometry(rt, rb, h, seg), color, shade), p));
const cone = (parts: Parts, r: number, h: number, color: string, p: Placement, seg = 14) =>
  parts.push(place(paint(new THREE.ConeGeometry(r, h, seg), color, 0.12), p));
const blob = (parts: Parts, r: number, color: string, p: Placement, detail = 1, lump = 0, seed = 1) =>
  parts.push(place(paint(lumpy(new THREE.IcosahedronGeometry(r, detail), lump, seed), color, 0.3), p));
const dome = (parts: Parts, r: number, color: string, p: Placement) =>
  parts.push(place(paint(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), color, 0.1), p));
const ring = (parts: Parts, r: number, tube: number, color: string, p: Placement) =>
  parts.push(place(paint(new THREE.TorusGeometry(r, tube, 8, 24), color, 0.1), p));

interface Ground {
  grass: string;
  soil: string;
  soilDark: string;
  sides?: number;
  turn?: number;
}

function base(parts: Parts, g: Ground, seed: number) {
  const R = ISLAND_RADIUS;
  const sides = g.sides ?? 30;
  const turn = g.turn ?? 0;
  parts.push(place(paint(lumpy(new THREE.CylinderGeometry(R, R * 0.985, 0.3, sides, 1), 0.025, seed, true), g.grass, 0.3), { y: TOP - 0.15, ry: turn }));
  parts.push(place(paint(new THREE.CylinderGeometry(R * 0.985, R * 0.92, 0.32, sides, 1), g.soil, 0.15), { y: TOP - 0.46, ry: turn }));
  parts.push(
    place(paint(lumpy(new THREE.CylinderGeometry(R * 0.92, R * 0.2, R * 0.9, sides, 4), 0.14, seed + 3, true), g.soilDark, 0.5), {
      y: TOP - 0.62 - R * 0.45,
      ry: turn,
    }),
  );
  const rnd = seeded(seed * 31);
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = R * (0.55 + rnd() * 0.3);
    blob(parts, 0.09 + rnd() * 0.08, '#8d8a86', { x: Math.cos(a) * rr, y: TOP - 0.9 - rnd() * 0.5, z: Math.sin(a) * rr }, 0);
  }
}

function bushes(parts: Parts, seed: number, color: string, spots: [number, number][]) {
  const rnd = seeded(seed);
  for (const [x, z] of spots) blob(parts, 0.1 + rnd() * 0.07, color, { x, y: TOP + 0.06, z, sy: 0.8 }, 1, 0.02, seed);
}

function tree(parts: Parts, x: number, z: number, h: number, leaf: string, seed: number) {
  cyl(parts, 0.06, 0.09, h, '#7a5236', { x, y: TOP + h / 2, z }, 8);
  blob(parts, 0.34, leaf, { x, y: TOP + h + 0.18, z }, 1, 0.05, seed);
  blob(parts, 0.24, leaf, { x: x + 0.18, y: TOP + h + 0.05, z: z + 0.08 }, 1, 0.04, seed + 1);
  blob(parts, 0.22, leaf, { x: x - 0.16, y: TOP + h + 0.08, z: z - 0.1 }, 1, 0.04, seed + 2);
}

function palm(parts: Parts, x: number, z: number, lean: number) {
  for (let i = 0; i < 5; i++) cyl(parts, 0.045, 0.055, 0.2, '#9b7148', { x: x + lean * i * i * 0.012, y: TOP + 0.1 + i * 0.19, z }, 7);
  const topX = x + lean * 16 * 0.012;
  const topY = TOP + 1.0;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    cone(parts, 0.07, 0.5, '#4f9a45', { x: topX + Math.cos(a) * 0.2, y: topY - 0.04, z: z + Math.sin(a) * 0.2, rz: Math.cos(a) * 1.9, rx: -Math.sin(a) * 1.9 }, 5);
  }
}

function water(parts: Parts, x: number, z: number, w: number, d: number, turn = 0) {
  box(parts, w, 0.03, d, '#6cc3e3', { x, y: TOP + 0.005, z, ry: turn }, 0);
}

const BUILDERS: Record<IslandStyle, (parts: Parts) => THREE.Vector3[]> = {
  // Discovery Valley: domed lab, iron-rock quarry, greenhouse, weather-vane tower, river and water wheel, hill.
  science(parts) {
    base(parts, { grass: '#8fc46a', soil: '#a7774f', soilDark: '#76503a' }, 11);
    cyl(parts, 0.56, 0.58, 0.14, '#d9d4cb', { x: -0.6, y: TOP + 0.07, z: -0.35 }, 24);
    dome(parts, 0.5, '#f4f1ea', { x: -0.6, y: TOP + 0.14, z: -0.35 });
    box(parts, 0.16, 0.26, 0.08, '#2f8f95', { x: -0.6, y: TOP + 0.27, z: 0.12 });
    const rocks: [number, number, number, number][] = [
      [0.72, 0.5, 0.3, 0],
      [0.98, 0.62, 0.22, 1],
      [0.62, 0.8, 0.2, 2],
      [0.92, 0.32, 0.17, 3],
      [0.45, 0.55, 0.16, 4],
      [1.15, 0.85, 0.15, 5],
    ];
    for (const [x, z, r, s] of rocks) blob(parts, r, s % 2 ? '#5d6472' : '#4c5260', { x, y: TOP + r * 0.55, z }, 0, 0.03, s);
    blob(parts, 0.12, '#9a5a45', { x: 0.82, y: TOP + 0.12, z: 0.86 }, 0);
    box(parts, 0.62, 0.36, 0.46, '#cfe9dc', { x: 0.85, y: TOP + 0.18, z: -0.6, ry: 0.3 }, 0.08);
    parts.push(place(paint(new THREE.CylinderGeometry(0.27, 0.27, 0.62, 3), '#e9f6ef', 0.05), { x: 0.85, y: TOP + 0.43, z: -0.6, rz: Math.PI / 2, ry: 0.3 + Math.PI / 2, rx: Math.PI / 2 }));
    cyl(parts, 0.07, 0.1, 0.95, '#f2efe8', { x: 0.1, y: TOP + 0.47, z: -1.2 }, 10);
    cone(parts, 0.13, 0.22, '#2f8f95', { x: 0.1, y: TOP + 1.05, z: -1.2 }, 10);
    box(parts, 0.42, 0.04, 0.04, '#e3a12b', { x: 0.1, y: TOP + 1.2, z: -1.2, ry: 0.6 });
    water(parts, -1.05, 0.55, 1.4, 0.34, -0.5);
    ring(parts, 0.3, 0.05, '#8b5e3c', { x: -1.5, y: TOP + 0.3, z: 0.95, ry: -0.5 + Math.PI / 2 });
    for (let i = 0; i < 4; i++) box(parts, 0.04, 0.58, 0.04, '#8b5e3c', { x: -1.5, y: TOP + 0.3, z: 0.95, ry: -0.5 + Math.PI / 2, rz: (i * Math.PI) / 4 });
    blob(parts, 0.55, '#7fb75c', { x: -0.15, y: TOP - 0.1, z: 1.05, sy: 0.6 }, 2, 0.04, 9);
    tree(parts, 1.35, -0.1, 0.35, '#6aa84f', 3);
    bushes(parts, 5, '#6aa84f', [[-1.2, -0.9], [0.35, -0.55], [-0.2, 0.3], [1.3, 0.35], [0.4, 1.35], [-0.95, -0.2]]);
    return [
      new THREE.Vector3(-0.6, TOP + 0.75, -0.35),
      new THREE.Vector3(0.78, TOP + 0.6, 0.55),
      new THREE.Vector3(0.85, TOP + 0.75, -0.6),
      new THREE.Vector3(0.1, TOP + 1.35, -1.2),
      new THREE.Vector3(-1.45, TOP + 0.75, 0.9),
      new THREE.Vector3(-0.15, TOP + 0.5, 1.1),
    ];
  },
  // Number Kingdom: castle of cubes and cylinders, number-line bridge, pie market, shape towers, gate.
  maths(parts) {
    base(parts, { grass: '#8fbf6c', soil: '#a2734d', soilDark: '#6f4c37' }, 21);
    box(parts, 0.72, 0.56, 0.6, '#efe6d3', { x: -0.1, y: TOP + 0.28, z: -0.45 });
    box(parts, 0.42, 0.34, 0.42, '#2d4b7c', { x: -0.1, y: TOP + 0.73, z: -0.45 });
    for (const [x, z] of [[-0.5, -0.8], [0.3, -0.8], [-0.5, -0.1], [0.3, -0.1]] as const) {
      cyl(parts, 0.13, 0.14, 0.82, '#3a5a8e', { x, y: TOP + 0.41, z }, 12);
      cone(parts, 0.16, 0.24, '#e8b83f', { x, y: TOP + 0.94, z }, 12);
    }
    for (let i = 0; i < 7; i++) {
      const a = -0.2 + i * 0.25;
      box(parts, 0.2, 0.08, 0.26, i % 2 ? '#efe6d3' : '#3a5a8e', { x: 1.05 * Math.cos(a), y: TOP + 0.05 + Math.sin((i / 6) * Math.PI) * 0.12, z: 0.35 + 1.05 * Math.sin(a) * 0.6, ry: -a });
    }
    parts.push(place(paint(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 24, 1, false, 0, Math.PI * 1.6), '#f0a24a', 0.1), { x: -0.95, y: TOP + 0.1, z: 0.65 }));
    parts.push(place(paint(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 24, 1, false, Math.PI * 1.6, Math.PI * 0.4), '#e2603d', 0.1), { x: -0.88, y: TOP + 0.1, z: 0.7 }));
    cone(parts, 0.26, 0.5, '#d99a4e', { x: 0.75, y: TOP + 0.25, z: -1.0 }, 4);
    blob(parts, 0.18, '#e2603d', { x: 1.15, y: TOP + 0.18, z: -0.55 }, 2);
    cyl(parts, 0.15, 0.15, 0.4, '#3a5a8e', { x: 1.25, y: TOP + 0.2, z: -0.95 }, 14);
    cyl(parts, 0.05, 0.05, 0.5, '#efe6d3', { x: -0.95, y: TOP + 0.25, z: -0.2 }, 8);
    cyl(parts, 0.05, 0.05, 0.5, '#efe6d3', { x: -1.3, y: TOP + 0.25, z: 0.05 }, 8);
    box(parts, 0.5, 0.08, 0.1, '#2d4b7c', { x: -1.12, y: TOP + 0.52, z: -0.07, ry: 0.6 });
    bushes(parts, 7, '#6aa84f', [[0.2, 1.2], [-0.4, 1.1], [1.3, 0.1], [-1.35, -0.75], [0.65, 0.95]]);
    return [
      new THREE.Vector3(-0.1, TOP + 1.2, -0.45),
      new THREE.Vector3(1.0, TOP + 0.45, 0.45),
      new THREE.Vector3(-0.92, TOP + 0.45, 0.68),
      new THREE.Vector3(0.95, TOP + 0.75, -0.85),
      new THREE.Vector3(-1.12, TOP + 0.85, -0.07),
    ];
  },
  // Story Forest: treehouse library, reading nook, lantern path, stepping stones, clearing.
  english(parts) {
    base(parts, { grass: '#79b25a', soil: '#9c7050', soilDark: '#6c4b37' }, 31);
    tree(parts, -0.45, -0.55, 0.75, '#4f9442', 2);
    box(parts, 0.42, 0.3, 0.38, '#c98f5a', { x: -0.45, y: TOP + 0.62, z: -0.2 });
    cone(parts, 0.34, 0.24, '#a2523a', { x: -0.45, y: TOP + 0.89, z: -0.2, ry: Math.PI / 4 }, 4);
    tree(parts, 0.75, -0.75, 0.55, '#5ea24b', 4);
    tree(parts, 1.1, 0.25, 0.45, '#4f9442', 6);
    tree(parts, -1.15, 0.45, 0.5, '#5ea24b', 8);
    box(parts, 0.42, 0.08, 0.16, '#b07a4c', { x: 0.35, y: TOP + 0.13, z: 0.6, ry: 0.4 });
    water(parts, 0.15, 1.1, 1.6, 0.3, 0.15);
    for (let i = 0; i < 4; i++) cyl(parts, 0.1, 0.11, 0.06, '#b8b3aa', { x: -0.35 + i * 0.3, y: TOP + 0.04, z: 1.05 + (i % 2) * 0.06 }, 10);
    for (let i = 0; i < 4; i++) {
      cyl(parts, 0.02, 0.025, 0.32, '#5a4636', { x: -0.95 + i * 0.32, y: TOP + 0.16, z: -0.05 + i * 0.05 }, 6);
      blob(parts, 0.05, '#ffd166', { x: -0.95 + i * 0.32, y: TOP + 0.35, z: -0.05 + i * 0.05 }, 0);
    }
    bushes(parts, 9, '#4f9442', [[1.3, -0.4], [-1.35, -0.45], [0.4, -1.25], [-0.6, 1.3]]);
    return [
      new THREE.Vector3(-0.45, TOP + 1.25, -0.2),
      new THREE.Vector3(0.35, TOP + 0.45, 0.6),
      new THREE.Vector3(-0.5, TOP + 0.6, 0.0),
      new THREE.Vector3(0.1, TOP + 0.4, 1.1),
      new THREE.Vector3(1.1, TOP + 1.0, 0.25),
    ];
  },
  // Akshar Garden: banyan swing, stepwell, marigold beds, clay pots, garden gate.
  hindi(parts) {
    base(parts, { grass: '#9cc46b', soil: '#a8784e', soilDark: '#76513a' }, 41);
    cyl(parts, 0.16, 0.24, 0.8, '#7a5236', { x: -0.3, y: TOP + 0.4, z: -0.55 }, 10);
    for (const [dx, dz, r] of [[0, 0, 0.62], [0.42, 0.15, 0.42], [-0.45, 0.1, 0.45], [0.05, -0.38, 0.45]] as const) {
      blob(parts, r, '#a9b84f', { x: -0.3 + dx, y: TOP + 1.0, z: -0.55 + dz, sy: 0.55 }, 1, 0.06, 13);
    }
    for (const [dx, dz] of [[0.45, 0.25], [-0.5, 0.2], [0.2, -0.45]] as const) cyl(parts, 0.025, 0.025, 0.75, '#8a6444', { x: -0.3 + dx, y: TOP + 0.38, z: -0.55 + dz }, 5);
    for (let i = 0; i < 3; i++) {
      const s = 0.62 - i * 0.16;
      parts.push(place(paint(new THREE.CylinderGeometry(s, s, 0.1, 4), i % 2 ? '#c99a63' : '#ddb67c', 0.1), { x: 0.75, y: TOP + 0.05 - i * 0.07, z: 0.35, ry: Math.PI / 4 }));
    }
    water(parts, 0.75, 0.35, 0.3, 0.3, Math.PI / 4);
    const rnd = seeded(77);
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * 0.55 + (i / 26) * Math.PI * 0.9;
      const rr = 1.38 + rnd() * 0.18;
      blob(parts, 0.07 + rnd() * 0.03, i % 3 ? '#f29a1f' : '#f7c531', { x: Math.cos(a) * rr, y: TOP + 0.07, z: Math.sin(a) * rr }, 0);
    }
    for (const [x, z] of [[-1.0, 0.45], [-0.82, 0.65], [-1.1, 0.75]] as const) {
      blob(parts, 0.13, '#c2643a', { x, y: TOP + 0.12, z, sy: 0.9 }, 1);
      cyl(parts, 0.06, 0.07, 0.08, '#a95330', { x, y: TOP + 0.26, z }, 10);
    }
    cyl(parts, 0.05, 0.05, 0.5, '#a95330', { x: 0.25, y: TOP + 0.25, z: 1.35 }, 8);
    cyl(parts, 0.05, 0.05, 0.5, '#a95330', { x: -0.25, y: TOP + 0.25, z: 1.35 }, 8);
    ring(parts, 0.25, 0.045, '#e8b83f', { x: 0, y: TOP + 0.5, z: 1.35, sz: 1 });
    bushes(parts, 11, '#6aa84f', [[1.3, -0.5], [0.6, -1.2], [-1.3, -0.6]]);
    return [
      new THREE.Vector3(-0.3, TOP + 1.45, -0.55),
      new THREE.Vector3(0.75, TOP + 0.4, 0.35),
      new THREE.Vector3(-0.2, TOP + 0.4, 1.0),
      new THREE.Vector3(-0.95, TOP + 0.55, 0.6),
      new THREE.Vector3(0, TOP + 0.95, 1.35),
    ];
  },
  // Akshara Hills: stone pavilion, terraces, coconut palms, lake and coracles, hilltop.
  kannada(parts) {
    base(parts, { grass: '#93c064', soil: '#cf6a3c', soilDark: '#8e4426' }, 51);
    for (let i = 0; i < 3; i++) {
      cyl(parts, 0.95 - i * 0.24, 0.98 - i * 0.24, 0.16, '#cf6a3c', { x: 0.35, y: TOP + 0.08 + i * 0.16, z: -0.35 }, 22, 0.3);
      cyl(parts, 0.94 - i * 0.24, 0.94 - i * 0.24, 0.02, '#86b95a', { x: 0.35, y: TOP + 0.17 + i * 0.16, z: -0.35 }, 22, 0);
    }
    for (const [x, z] of [[-0.95, -0.55], [-0.55, -0.55], [-0.95, -0.95], [-0.55, -0.95]] as const) cyl(parts, 0.05, 0.06, 0.45, '#cdbb9f', { x, y: TOP + 0.23, z }, 8);
    box(parts, 0.62, 0.08, 0.62, '#b9a587', { x: -0.75, y: TOP + 0.49, z: -0.75 });
    cone(parts, 0.42, 0.22, '#a99377', { x: -0.75, y: TOP + 0.64, z: -0.75, ry: Math.PI / 4 }, 4);
    palm(parts, 1.15, 0.65, 1);
    palm(parts, -1.25, 0.25, -1);
    palm(parts, 0.55, 1.2, 0.5);
    parts.push(place(paint(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 24), '#6cc3e3', 0), { x: -0.35, y: TOP + 0.01, z: 0.75 }));
    dome(parts, 0.1, '#8b5e3c', { x: -0.45, y: TOP + 0.02, z: 0.7, rx: Math.PI });
    dome(parts, 0.08, '#8b5e3c', { x: -0.2, y: TOP + 0.02, z: 0.85, rx: Math.PI });
    return [
      new THREE.Vector3(-0.75, TOP + 1.0, -0.75),
      new THREE.Vector3(0.35, TOP + 0.8, -0.35),
      new THREE.Vector3(1.15, TOP + 1.15, 0.65),
      new THREE.Vector3(-0.35, TOP + 0.4, 0.75),
      new THREE.Vector3(0.45, TOP + 1.05, -0.4),
    ];
  },
  // Explorer's Atlas: village council hall, map table and compass plaza, hill fort, market street, river port.
  social(parts) {
    base(parts, { grass: '#d9bf8f', soil: '#b98b5e', soilDark: '#7f5a3a', sides: 4, turn: Math.PI / 4 }, 61);
    parts.push(place(paint(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 28), '#efe2c6', 0), { x: 0.1, y: TOP + 0.02, z: 0.15 }));
    cone(parts, 0.1, 0.8, '#c9641b', { x: 0.1, y: TOP + 0.06, z: 0.15, rx: Math.PI / 2, sy: 1, sz: 0.15 }, 4);
    cone(parts, 0.1, 0.8, '#2d4b7c', { x: 0.1, y: TOP + 0.06, z: 0.15, rz: Math.PI / 2, sz: 0.15 }, 4);
    box(parts, 0.62, 0.34, 0.44, '#e8dcc2', { x: -0.7, y: TOP + 0.17, z: -0.7 });
    cone(parts, 0.48, 0.3, '#a2523a', { x: -0.7, y: TOP + 0.49, z: -0.7, ry: Math.PI / 4, sx: 1.15 }, 4);
    blob(parts, 0.45, '#b9965e', { x: 0.85, y: TOP - 0.1, z: -0.8, sy: 0.55 }, 1, 0.03, 4);
    for (const [x, z] of [[0.6, -0.95], [1.05, -0.95], [0.6, -0.55], [1.05, -0.55]] as const) cyl(parts, 0.08, 0.09, 0.42, '#c8a77a', { x, y: TOP + 0.3, z }, 8);
    box(parts, 0.45, 0.16, 0.05, '#c8a77a', { x: 0.83, y: TOP + 0.24, z: -0.95 });
    box(parts, 0.45, 0.16, 0.05, '#c8a77a', { x: 0.83, y: TOP + 0.24, z: -0.55 });
    const awnings = ['#e2603d', '#2f8f95', '#e8b83f'];
    for (let i = 0; i < 3; i++) {
      box(parts, 0.3, 0.22, 0.26, '#f0e4cb', { x: -0.9 + i * 0.38, y: TOP + 0.11, z: 0.95 });
      box(parts, 0.34, 0.04, 0.32, awnings[i], { x: -0.9 + i * 0.38, y: TOP + 0.25, z: 0.98, rx: 0.2 });
    }
    water(parts, 1.15, 0.6, 0.35, 1.1, 0);
    box(parts, 0.3, 0.08, 0.14, '#8b5e3c', { x: 1.15, y: TOP + 0.06, z: 0.5 });
    return [
      new THREE.Vector3(-0.7, TOP + 0.95, -0.7),
      new THREE.Vector3(0.1, TOP + 0.4, 0.15),
      new THREE.Vector3(0.83, TOP + 0.85, -0.75),
      new THREE.Vector3(-0.5, TOP + 0.6, 0.95),
      new THREE.Vector3(1.15, TOP + 0.4, 0.6),
    ];
  },
};

const cache = new Map<IslandStyle, IslandModel>();

/** Builds (once) and returns an island. Callers must not dispose the shared geometry. */
export function islandModel(style: IslandStyle): IslandModel {
  const hit = cache.get(style);
  if (hit) return hit;
  const parts: Parts = [];
  const anchors = BUILDERS[style](parts);
  const model = { geometry: merge(parts), anchors, top: TOP };
  cache.set(style, model);
  return model;
}
