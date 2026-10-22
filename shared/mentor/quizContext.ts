import type { QuizQuestion, Topic } from '../curriculum/types.js';
import type { MentorQuizContext } from './types.js';

/**
 * The Practice question the learner is on, rebuilt from the curriculum. The
 * browser only sends ids (question id, chosen option id or "true"/"false");
 * the question text, answer key, hint and explanation are read here, and the
 * answer is checked here against the answer key. The AI never decides whether
 * an answer is right.
 */
export interface QuizFacts {
  prompt: string;
  /** Answer choices as shown, e.g. ["A) A plastic spoon", ...], or "True or false". */
  choices: string[];
  /** What the learner chose, if they answered. */
  answerText?: string;
  /** Checked against the answer key; undefined when there is no answer (or for matching questions). */
  correct?: boolean;
  /** The learner may see the correct answer: they got it right, or the app has shown it. */
  answerShown: boolean;
  correctText: string;
  explanation: string;
  hint: string;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function correctText(q: QuizQuestion): string {
  switch (q.type) {
    case 'single-choice':
      return q.options.find((o) => o.id === q.correctOptionId)?.text ?? '';
    case 'true-false':
      return q.correct ? 'True' : 'False';
    case 'match-pairs':
      return q.pairs.map((p) => `${p.left} → ${p.right}`).join('; ');
  }
}

/** The answer text and whether it is right, for an option id or "true"/"false". */
function checkAnswer(q: QuizQuestion, answer: string | undefined): { text?: string; correct?: boolean } {
  if (!answer) return {};
  if (q.type === 'single-choice') {
    const option = q.options.find((o) => o.id === answer);
    return option ? { text: option.text, correct: option.id === q.correctOptionId } : {};
  }
  if (q.type === 'true-false' && (answer === 'true' || answer === 'false')) {
    const value = answer === 'true';
    return { text: value ? 'True' : 'False', correct: value === q.correct };
  }
  return {};
}

export function quizFacts(topic: Topic | undefined, quiz: MentorQuizContext | undefined): QuizFacts | undefined {
  const q = quiz && topic?.practice.questions.find((x) => x.id === quiz.questionId);
  if (!q || !quiz) return undefined;
  const checked = checkAnswer(q, quiz.answer);
  return {
    prompt: q.prompt,
    choices:
      q.type === 'single-choice' ? q.options.map((o, i) => `${LETTERS[i]}) ${o.text}`) : q.type === 'true-false' ? ['True or false'] : q.pairs.map((p) => `Match: ${p.left}`),
    answerText: checked.text,
    correct: checked.correct,
    answerShown: checked.correct === true || quiz.answerShown === true,
    correctText: correctText(q),
    explanation: q.explanation,
    hint: q.hint,
  };
}

/** Prompt lines for the AI mentor about the question on screen. */
export function quizPromptLines(f: QuizFacts): string[] {
  const lines = [`- Practice question on screen: "${f.prompt}" (${f.choices.join('; ')})`];
  if (f.answerText !== undefined) {
    lines.push(`- The child answered "${f.answerText}". The app checked it against the answer key: ${f.correct ? 'correct' : 'not correct'}.`);
  }
  if (f.answerShown) {
    lines.push(`- The correct answer is already on the child's screen: "${f.correctText}". Explanation from the lesson: ${f.explanation}`);
  } else {
    lines.push(`- The child has not finished this question: do not say which answer is correct. Help them think it through, building on this hint from the lesson: ${f.hint}`);
  }
  return lines;
}
