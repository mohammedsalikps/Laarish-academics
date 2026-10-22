/**
 * The two Laarish mentor characters. A learner chooses one; it then speaks
 * for the app everywhere (chat, lesson steps, games, rewards).
 *
 * Rishi and Ayra are personas of one shared AI model, not separate models:
 * the persona only changes tone and wording, never the facts.
 * Artwork: public/mentors/<id>.webp (full body) and <id>-face.webp (head),
 * cut out from the originals in assets/mentors/.
 */

export const MENTOR_IDS = ['rishi', 'ayra'] as const;
export type MentorId = (typeof MENTOR_IDS)[number];

export interface MentorPersona {
  id: MentorId;
  name: string;
  /** One friendly line shown when choosing a mentor. */
  intro: string;
  /** How the character talks, for the AI prompt (tone only). */
  personality: string;
  /** A short catchphrase the character may use now and then. */
  catchphrase: string;
  /** Soft background behind the round face picture, and an accent colour. */
  colors: { soft: string; accent: string };
  /** Full-body artwork size, for layout without shifting. */
  art: { width: number; height: number };
}

export const MENTORS: Record<MentorId, MentorPersona> = {
  rishi: {
    id: 'rishi',
    name: 'Rishi',
    intro: "Let's explore and solve problems together!",
    personality:
      'Rishi is a curious, playful problem-solver who loves testing ideas and figuring out how things work. Rishi is upbeat and encouraging, suggests trying, checking and trying again, and celebrates good thinking more than right answers.',
    catchphrase: "Let's test it!",
    colors: { soft: '#EEF2D6', accent: '#6B7A12' },
    art: { width: 771, height: 900 },
  },
  ayra: {
    id: 'ayra',
    name: 'Ayra',
    intro: "Let's discover new things together!",
    personality:
      'Ayra is a warm, curious discoverer who loves noticing details and asking good questions. Ayra is gentle and cheerful, invites the child to look closely and wonder, and makes the child feel their ideas matter.',
    catchphrase: "Let's look closely!",
    colors: { soft: '#FFF2C6', accent: '#9A6A00' },
    art: { width: 743, height: 900 },
  },
};

export function isMentorId(value: unknown): value is MentorId {
  return typeof value === 'string' && (MENTOR_IDS as readonly string[]).includes(value);
}

export function getMentor(id: unknown): MentorPersona | undefined {
  return isMentorId(id) ? MENTORS[id] : undefined;
}
