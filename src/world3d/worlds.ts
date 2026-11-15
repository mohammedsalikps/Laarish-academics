import type { SubjectId } from '../domain/types';
import type { IslandStyle } from './islands';

/**
 * The six subject worlds (wireframe page 1, "Subject world tints", and page 3).
 * A tint is used only for that world's chips, headers and map labels, never
 * for buttons, progress bars or "done"; every chip also shows the name and icon,
 * so colour never carries meaning alone.
 */
export interface WorldTheme {
  subjectId: SubjectId;
  style: IslandStyle;
  name: string;
  /** World tint (hex). */
  tint: string;
  /** Text colour that reads on the tint. */
  onTint: string;
  /** Soft background version of the tint. */
  soft: string;
  /** Lucide icon name used in chips. */
  icon: 'flask' | 'crown' | 'book' | 'flower' | 'mountain' | 'compass';
  /** Position in the hub ring and on the 2D map (syllabus order is the screen-reader order). */
  order: number;
  /** Where the island sits on the Lite-mode 2D map, as % of the map box. */
  map: { x: number; y: number };
}

export const WORLDS: readonly WorldTheme[] = [
  { subjectId: 'science', style: 'science', name: 'Discovery Valley', tint: '#35BFC7', onTint: '#0B3D44', soft: '#E3F5F6', icon: 'flask', order: 0, map: { x: 16, y: 34 } },
  { subjectId: 'mathematics', style: 'maths', name: 'Number Kingdom', tint: '#18325A', onTint: '#FBF8F3', soft: '#E3E8F0', icon: 'crown', order: 1, map: { x: 50, y: 16 } },
  { subjectId: 'english', style: 'english', name: 'Story Forest', tint: '#6DBE72', onTint: '#123F18', soft: '#E7F4E8', icon: 'book', order: 2, map: { x: 84, y: 34 } },
  { subjectId: 'hindi', style: 'hindi', name: 'Akshar Garden', tint: '#FDF0C8', onTint: '#5A4300', soft: '#FEF7E2', icon: 'flower', order: 3, map: { x: 30, y: 74 } },
  { subjectId: 'kannada', style: 'kannada', name: 'Akshara Hills', tint: '#F28A3D', onTint: '#4A2208', soft: '#FDEBDD', icon: 'mountain', order: 4, map: { x: 56, y: 84 } },
  { subjectId: 'social-science', style: 'social', name: "Explorer's Atlas", tint: '#C9641B', onTint: '#FFF7EF', soft: '#F7E6D8', icon: 'compass', order: 5, map: { x: 82, y: 70 } },
];

const BY_SUBJECT = new Map(WORLDS.map((w) => [w.subjectId, w]));

export function worldFor(subjectId: SubjectId): WorldTheme {
  return BY_SUBJECT.get(subjectId)!;
}

export function isWorldId(value: string | undefined): value is SubjectId {
  return value !== undefined && BY_SUBJECT.has(value as SubjectId);
}
