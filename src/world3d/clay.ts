import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Small helpers for building "clay" scenery: primitive shapes painted with
 * vertex colours and merged into one geometry, so a whole island is a single
 * draw call. No textures, no lights baked in, nothing to download.
 */

export interface Placement {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  /** Uniform scale, or per-axis with sx/sy/sz. */
  s?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();
const tmpMatrix = new THREE.Matrix4();

/** Moves, turns and scales a geometry in place. */
export function place<T extends THREE.BufferGeometry>(geometry: T, p: Placement): T {
  const s = p.s ?? 1;
  tmpQuat.setFromEuler(tmpEuler.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0));
  tmpMatrix.compose(new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0), tmpQuat, new THREE.Vector3(p.sx ?? s, p.sy ?? s, p.sz ?? s));
  geometry.applyMatrix4(tmpMatrix);
  return geometry;
}

/**
 * Paints every vertex one colour. `shadeBottom` darkens the lower part of the
 * shape (0–1), a cheap stand-in for ambient occlusion that keeps the clay look.
 */
export function paint<T extends THREE.BufferGeometry>(geometry: T, color: THREE.ColorRepresentation, shadeBottom = 0): T {
  const c = new THREE.Color(color);
  const pos = geometry.getAttribute('position');
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;
  const span = max.y - min.y || 1;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min.y) / span;
    const k = 1 - shadeBottom * (1 - t);
    colors[i * 3] = c.r * k;
    colors[i * 3 + 1] = c.g * k;
    colors[i * 3 + 2] = c.b * k;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** A repeatable pseudo-random number from a position, so seams of a mesh move together. */
function hash3(x: number, y: number, z: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return v - Math.floor(v);
}

/** Nudges vertices for a hand-made, lumpy look. Same position → same nudge, so there are no cracks. */
export function lumpy<T extends THREE.BufferGeometry>(geometry: T, amount: number, seed = 1, keepTop = false): T {
  const pos = geometry.getAttribute('position');
  geometry.computeBoundingBox();
  const topY = geometry.boundingBox!.max.y;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (keepTop && Math.abs(y - topY) < 1e-4) continue;
    const r = (hash3(+x.toFixed(3), +y.toFixed(3), +z.toFixed(3), seed) - 0.5) * 2 * amount;
    const len = Math.hypot(x, z) || 1;
    pos.setXYZ(i, x + (x / len) * r, y + r * 0.35, z + (z / len) * r);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Merges painted parts into one geometry (one draw call). */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared = parts.map((g) => {
    const flat = g.index ? g.toNonIndexed() : g;
    flat.deleteAttribute('uv');
    if (!flat.getAttribute('normal')) flat.computeVertexNormals();
    return flat;
  });
  const merged = mergeGeometries(prepared, false);
  if (!merged) throw new Error('Could not merge island parts');
  prepared.forEach((g) => g.dispose());
  parts.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}

/** A deterministic random generator for laying out scenery the same way every time. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
