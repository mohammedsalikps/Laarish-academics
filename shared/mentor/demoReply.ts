import type { TopicMentor } from '../curriculum/types.js';
import { extractCalculations } from './calculator.js';
import type { MentorGrounding } from './grounding.js';
import { progressEncouragement } from './progress.js';
import { quizFacts } from './quizContext.js';
import { safetyReply, screenLearnerText } from './safety.js';
import { LANGUAGE_NAMES, suggestedPrompts, type MentorIntent, type MentorReply, type MentorRequest } from './types.js';

/**
 * Demo mentor: a deterministic, rule-based responder used when no AI provider
 * is configured (or when the API is unreachable). It answers from the topic's
 * curriculum data and the learner's context. It is NOT an AI model, and the UI
 * labels its answers as "Demo answer".
 *
 * The server answers with demoMentorReply (demoMentor.ts, full curriculum); the
 * browser calls demoReply with the grounding of the subject it has loaded.
 */

/** "What is my name?" style questions. The browser answers these itself; this is the server-side safety net. */
export const NAME_QUESTION = /\b(what('?s| is)|tell me|do you know|say)\b[^?.!]{0,15}\bmy name\b|\bwho am i\b/i;

/** "How am I doing?" style questions about the learner's own progress. */
export const PROGRESS_QUESTION =
  /\b(what('?s| is)|how('?s| is)|show|tell me|check)\b[^?.!]{0,20}\bmy (progress|score|level|stars|xp|streak)\b|\bhow (am i|i am|'?m i) doing\b|\bhow (much|many|far)\b[^?.!]{0,25}\b(have i|did i|i have)\b[^?.!]{0,20}\b(done|finished|completed|learn(ed|t)?)\b/i;

const INTENT_PATTERNS: [MentorIntent, RegExp][] = [
  ['progress', PROGRESS_QUESTION],
  ['language', /\b(in hindi|in kannada|my language|hindi mein|kannada dalli)\b/i],
  ['practice', /\b(practice|quiz me|test me|ask me|question for me|another question)\b/i],
  ['mistake', /\b(mistake|wrong|incorrect|got it wrong|why was i)\b/i],
  ['hint', /\b(hint|clue|stuck|help me)\b/i],
  ['simpler', /\b(simpl|easier|easy way|don'?t understand|do not understand|confus|explain again)\b/i],
  ['example', /\b(example|real[- ]life|everyday|in real)\b/i],
  ['why', /^\s*why\b|\bwhy did\b|\bwhy does\b|\bhow come\b/i],
];

export function inferIntent(text: string): MentorIntent {
  for (const [intent, re] of INTENT_PATTERNS) if (re.test(text)) return intent;
  return 'free';
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function keywordMatches(lower: string, keyword: string): boolean {
  const k = keyword.toLowerCase();
  if (k.length > 4 || /[^\p{ASCII}]/u.test(k)) return lower.includes(k);
  // Short keywords must match whole words ("red" should not match "covered").
  return new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`).test(lower);
}

function bestFaq(mentor: TopicMentor, lower: string): string | undefined {
  const scored = mentor.faq
    .map((f) => ({ f, score: f.keywords.filter((kw) => keywordMatches(lower, kw)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.f.answer;
}

/** If the previous mentor message was a practice question, find it so we can check the answer. */
function pendingPractice(req: MentorRequest, mentor: TopicMentor) {
  const prevMentor = [...req.messages.slice(0, -1)].reverse().find((m) => m.role === 'mentor');
  if (!prevMentor) return undefined;
  return mentor.practice.find((p) => prevMentor.text.includes(p.question));
}

function followUps(step: MentorRequest['context']['step'], intent: MentorIntent): string[] {
  return suggestedPrompts(step)
    .filter((p) => p.intent !== intent)
    .slice(0, 3)
    .map((p) => p.label);
}

/** The demo answer to a request, from the grounding of its topic (see grounding.ts). */
export function demoReply(req: MentorRequest, grounding: MentorGrounding): MentorReply {
  const { mentor, focus } = grounding;
  const step = req.context.step ?? 'none';
  // The Practice question on screen, checked against the answer key (never decided by the mentor).
  const quiz = quizFacts(grounding.topic, req.context.quiz);
  const last = req.messages[req.messages.length - 1]?.text ?? '';
  const screen = screenLearnerText(last);
  if (screen.kind !== 'ok') return { reply: safetyReply(screen.kind, focus), provider: 'demo', flagged: screen.kind };

  const turn = req.messages.filter((m) => m.role === 'mentor').length;
  const lower = last.toLowerCase();
  // Progress questions take priority over keyword FAQs such as "level" or "stars".
  const explicit: MentorIntent | undefined = req.intent && req.intent !== 'free' ? req.intent : PROGRESS_QUESTION.test(last) ? 'progress' : undefined;

  if (!explicit && NAME_QUESTION.test(last)) {
    return {
      reply: "Your name is on your profile in the app. I don't need it to help you learn, so let's keep exploring together!",
      provider: 'demo',
      followUps: followUps(step, 'free'),
    };
  }

  // Checking an answer to a practice question we asked.
  const practice = explicit ? undefined : pendingPractice(req, mentor);
  if (practice) {
    const correct = practice.accept.some((a) => keywordMatches(lower, a));
    const reply = correct
      ? `Yes, that's right! ${practice.explanation} Want to try another practice question?`
      : `Good try! Here's the idea: ${practice.explanation} Would you like another question to practise?`;
    return { reply, provider: 'demo', followUps: ['Ask me a practice question', 'Explain this more simply'] };
  }

  // Arithmetic: answer with the verified calculation, then explain the step.
  const calcs = explicit ? [] : extractCalculations(last);
  if (calcs.length > 0) {
    // During Practice the quiz is being marked, so give a first step instead of the answer.
    if (step === 'practice') {
      return {
        reply: `I checked ${calcs[0].expression} with my calculator, so I know the answer, but let's find it together! Do one small step first, then tell me what you get and I'll help you check it.`,
        provider: 'demo',
        followUps: followUps(step, 'hint'),
      };
    }
    const lines = calcs.map((c) => `${c.expression} = ${c.result}`).join('; ');
    return {
      reply: `I checked it with my calculator: ${lines}. Can you see how we get there? Try doing it step by step, and tell me if you want a hint.`,
      provider: 'demo',
      followUps: followUps(step, 'free'),
    };
  }

  // Typed questions about a specific idea ("why is ice slippery?") are answered from
  // the topic FAQ first; only then do generic intents like "why" or "hint" apply.
  const faq = explicit ? undefined : bestFaq(mentor, lower);
  if (faq) return { reply: faq, provider: 'demo', followUps: followUps(step, 'free') };

  const intent = explicit ?? inferIntent(last);
  let reply: string;
  switch (intent) {
    case 'simpler':
      reply = mentor.simpler;
      break;
    case 'example':
      reply = pick(mentor.examples, turn);
      break;
    case 'why':
      reply = req.context.recentResult
        ? `Let's look at your last try. ${req.context.recentResult} ${mentor.why ?? mentor.simpler}`
        : `${mentor.why ?? mentor.simpler} Try the activity and ask me again, and I'll explain what happened in your own result.`;
      break;
    case 'hint': {
      const stepHint = step === 'watch' || step === 'play' || step === 'practice' ? mentor.hints[step] : undefined;
      reply = quiz && !quiz.answerShown ? `Here is a hint for this question: ${quiz.hint}` : (stepHint ?? mentor.hints.default);
      break;
    }
    case 'mistake':
      reply = quiz
        ? quiz.answerShown
          ? `${quiz.correct ? 'You got it!' : 'Mistakes help our brains grow!'} ${quiz.explanation}`
          : `Good try! Here is a hint: ${quiz.hint}`
        : req.context.lastMistake
        ? `Mistakes help our brains grow! ${req.context.lastMistake} Would you like a practice question to try again?`
        : "I don't see any mistakes yet. If you get a quiz question wrong, ask me again and I'll explain it step by step.";
      break;
    case 'practice':
      reply = mentor.practice.length
        ? `Here's a practice question: ${pick(mentor.practice, turn).question} Type your answer below!`
        : 'Open a topic and I can ask you practice questions about it!';
      break;
    case 'progress':
      reply = req.context.progress
        ? progressEncouragement(req.context.progress)
        : "I can't see your progress right now. Open the Progress page to see your topics, stars and streak!";
      break;
    case 'language': {
      const lang = req.context.replyLanguage ?? 'en';
      reply =
        lang === 'en'
          ? `${mentor.simpler} (You can choose Hindi or Kannada for your mentor in Settings.)`
          : `I'm the demo mentor, so I can only explain in English right now. When the live AI mentor is switched on, I can explain this in ${LANGUAGE_NAMES[lang]}. Here it is simply: ${mentor.simpler}`;
      break;
    }
    default:
      reply = lower.includes(focus.split(' ')[0])
        ? `${mentor.facts[0]} ${mentor.facts[1] ?? ''}`.trim()
        : `That's a great question! I'm the demo mentor, so right now I can only answer questions about ${focus}. When the live AI mentor is switched on, I'll be able to help with more. Try one of the buttons below!`;
  }

  return { reply, provider: 'demo', followUps: followUps(step, intent) };
}
