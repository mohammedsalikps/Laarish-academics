import type { MentorPersona } from '../../shared/mentor/personas';
import type { SubjectId, Topic } from '../domain/types';
import type { QuestionProgress, QuizFeedback } from './quizLogic';

/**
 * What the mentor says in the comic-style quiz. The facts (questions, hints,
 * explanations) always come from the topic's curriculum data; these lines only
 * add a short, kind reaction in the chosen mentor's voice.
 */

const FIRST_TRY: Record<SubjectId, string[]> = {
  science: ['Great discovery!', 'Brilliant observing!', 'Spot on, scientist!', 'You worked it out!'],
  mathematics: ['Great working out!', 'Spot on!', 'Brilliant maths!', 'You got it!'],
  english: ['Well done!', 'Spot on!', 'Brilliant!', 'You got it!'],
  hindi: ['Well done!', 'Spot on!', 'Brilliant!', 'You got it!'],
  kannada: ['Well done!', 'Spot on!', 'Brilliant!', 'You got it!'],
  'social-science': ['Great thinking!', 'Spot on!', 'Brilliant!', 'You got it!'],
};

export function welcomeLine(persona: MentorPersona, topic: Pick<Topic, 'title' | 'practice'>, count: number): string {
  const opening = topic.practice.intro ?? `Ready for a challenge about ${topic.title.toLowerCase().replace(/[?!.]$/, '')}?`;
  return `${opening} I'll ask you ${count} question${count === 1 ? '' : 's'}, one at a time. ${persona.catchphrase}`;
}

export interface Reaction {
  /** The short reaction, e.g. "Great discovery!". */
  title: string;
  /** What to do or know next. */
  body: string;
  mood: 'cheer' | 'think' | 'explain';
}

/** The mentor's reaction to an answer: praise, a gentle "try again" with the hint, or the answer explained. */
export function reaction(subjectId: SubjectId, feedback: Exclude<QuizFeedback, null>, progress: QuestionProgress, index: number, question: { hint: string; explanation: string }, correctText: string): Reaction {
  if (feedback === 'correct') {
    const firstTry = progress.attempts === 1 && !progress.usedHint;
    const lines = FIRST_TRY[subjectId];
    return { title: firstTry ? lines[index % lines.length] : 'Well done for sticking with it!', body: question.explanation, mood: 'cheer' };
  }
  if (feedback === 'retry') return { title: "Good try! Let's think about it again.", body: `Hint: ${question.hint}`, mood: 'think' };
  return { title: `That's okay, this one was tricky. The answer is: ${correctText}.`, body: question.explanation, mood: 'explain' };
}

export function finishLine(score: number, passed: boolean): string {
  if (score >= 1) return 'Wow, every answer right on the first try! You really understand this.';
  if (passed) return 'You did it! Great effort. Every question you answer makes your brain stronger.';
  return "Good effort! Let's look at the ideas again and have another go. You'll get there!";
}
