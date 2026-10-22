import type { AvatarId } from '../state/progressTypes';

/** Cosmetic avatars. Extra avatars are unlocked with coins earned by learning; there is no real money. */
export interface AvatarDefinition {
  id: AvatarId;
  name: string;
  cost: number;
}

export const AVATARS: AvatarDefinition[] = [
  { id: 'fox', name: 'Fox', cost: 0 },
  { id: 'panda', name: 'Panda', cost: 0 },
  { id: 'bunny', name: 'Bunny', cost: 0 },
  { id: 'cat', name: 'Cat', cost: 30 },
  { id: 'robot', name: 'Robot', cost: 50 },
  { id: 'dino', name: 'Dino', cost: 80 },
];

export function getAvatar(id: AvatarId): AvatarDefinition {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
