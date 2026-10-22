/** Short, original encouragement lines shown on Home. One per day, in a fixed rotation. */
export const DAILY_MESSAGES: readonly string[] = [
  'Every expert was once a beginner. Today is a great day to learn something new!',
  'Mistakes are proof that you are trying. Keep going!',
  'Curious minds ask "why?". What will you wonder about today?',
  'Small steps every day add up to big adventures.',
  'Your brain grows stronger every time you practise.',
  'It is okay not to know yet. "Yet" is a powerful word!',
  'Try, think, try again. That is how scientists work.',
  'Learning is like a game: every level you finish unlocks the next one.',
  'Ask questions, explore, and have fun along the way!',
  'Be proud of what you learned yesterday, and excited for today.',
];

/** Picks the message for a local date key (YYYY-MM-DD) so it changes once a day. */
export function dailyMessage(dayKey: string): string {
  let hash = 0;
  for (const ch of dayKey) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_003;
  return DAILY_MESSAGES[hash % DAILY_MESSAGES.length];
}
