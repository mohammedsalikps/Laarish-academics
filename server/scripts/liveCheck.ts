import Anthropic from '@anthropic-ai/sdk';
import type { MentorRequest } from '../../shared/mentor/types.js';
import { readMentorConfig } from '../mentor/config.js';
import { createMentorService } from '../mentor/handler.js';

/**
 * Live AI check: `npm run mentor:check`
 *
 * 1. Confirms the configured model id with the Anthropic Models API.
 * 2. Sends real mentor requests through the same server handler the app uses,
 *    as both mentor personas (Rishi and Ayra share one model).
 * The API key is read from the environment / .env and is never printed.
 */

const CASES: { label: string; request: MentorRequest }[] = [
  {
    label: 'Rishi: who are you? (Grade 3)',
    request: {
      messages: [{ role: 'learner', text: 'What is your name?' }],
      context: { subjectId: 'science', lessonId: 'friction', topicId: 'friction-what-is', step: 'watch', grade: 3, mentor: 'rishi' },
    },
  },
  {
    label: 'Ayra: who are you? (Grade 3)',
    request: {
      messages: [{ role: 'learner', text: 'What is your name?' }],
      context: { subjectId: 'science', lessonId: 'friction', topicId: 'friction-what-is', step: 'watch', grade: 3, mentor: 'ayra' },
    },
  },
  {
    label: 'Rishi: science question in the game (Push the Box, Grade 3)',
    request: {
      messages: [{ role: 'learner', text: 'Why does the box stop on the carpet?' }],
      context: {
        subjectId: 'science',
        lessonId: 'friction',
        topicId: 'friction-what-is',
        step: 'play',
        grade: 3,
        mentor: 'rishi',
        activity: 'Push the Box (Push the box). Current instruction: Pick a floor, choose a push, then press Push!',
      },
    },
  },
  {
    label: 'Ayra: maths explanation with exact calculation (Grade 3)',
    request: {
      messages: [{ role: 'learner', text: 'How do I find 3/4 of 12?' }],
      context: { subjectId: 'mathematics', lessonId: 'halves-and-quarters', topicId: 'fractions-quarters', step: 'watch', grade: 3, mentor: 'ayra' },
    },
  },
  {
    label: 'Progress explanation from app numbers (Grade 4)',
    request: {
      messages: [{ role: 'learner', text: 'What is my progress?' }],
      intent: 'progress',
      context: {
        subjectId: 'science',
        step: 'none',
        grade: 4,
        progress: { level: 2, stars: 6, streakDays: 2, topicsCompleted: 2, topicsTotal: 22, lessonsCompleted: 0, lessonsTotal: 10, currentTopicId: 'friction-helps-us', currentStep: 'play', nextTopicId: 'friction-helps-us', nextStep: 'play', subjectId: 'science', subjectTopicsMastered: 2, subjectTopicsTotal: 6 },
      },
    },
  },
  {
    label: 'Question about the lesson video during Watch (Grade 4)',
    request: {
      messages: [{ role: 'learner', text: 'In the video, why did the box stop sooner on the carpet than on the ice?' }],
      context: { subjectId: 'science', lessonId: 'friction', topicId: 'friction-what-is', step: 'watch', grade: 4 },
    },
  },
  {
    label: 'Ayra: Friction Lab result with ramp height (Grade 4)',
    request: {
      messages: [{ role: 'learner', text: 'Why did the car go less far this time?' }],
      intent: 'why',
      context: {
        subjectId: 'science',
        lessonId: 'friction',
        topicId: 'friction-rough-smooth',
        step: 'play',
        grade: 4,
        mentor: 'ayra',
        activity: 'Friction Lab (Friction experiment). Current instruction: Change only the push: start the car lower on the ramp.',
        recentResult: 'On polished wood from the middle of the ramp the car rolled 2.3 m (a medium distance). Your prediction was right.',
      },
    },
  },
  {
    label: 'Sentence Builder hint during Play (Grade 2)',
    request: {
      messages: [{ role: 'learner', text: 'Which word goes first?' }],
      intent: 'hint',
      context: { subjectId: 'english', lessonId: 'building-sentences', topicId: 'sentences-word-order', step: 'play', grade: 2 },
    },
  },
  {
    label: 'Rishi: new Class 7 circuit topic during Play',
    request: {
      messages: [{ role: 'learner', text: 'Why does the bulb stay off when I put the plastic straw in the gap?' }],
      context: { subjectId: 'science', lessonId: 's7-electricity', topicId: 's7-electricity-circuits', step: 'play', grade: 7, mentor: 'rishi' },
    },
  },
  {
    label: 'Ayra: honesty about the syllabus (Class 6 integers)',
    request: {
      messages: [{ role: 'learner', text: 'Is this exactly what will come in my school exam?' }],
      context: { subjectId: 'mathematics', lessonId: 'm6-other-side-of-zero', topicId: 'm6-integers-number-line', step: 'watch', grade: 6, mentor: 'ayra' },
    },
  },
  {
    label: 'Explain in Hindi (Grade 2)',
    request: {
      messages: [{ role: 'learner', text: 'Explain it in my language' }],
      intent: 'language',
      context: { subjectId: 'hindi', lessonId: 'hindi-colours', topicId: 'hindi-colours-bright', step: 'watch', grade: 2, replyLanguage: 'hi' },
    },
  },
];

async function main() {
  const config = readMentorConfig(process.env);
  if (!config.apiKey) {
    console.log('LIVE AI NOT VERIFIED: ANTHROPIC_API_KEY is not set.');
    console.log('Add ANTHROPIC_API_KEY=... to a .env file in the project folder (or the environment) and run `npm run mentor:check` again.');
    process.exitCode = 2;
    return;
  }

  const client = new Anthropic({ apiKey: config.apiKey, maxRetries: 1, timeout: config.timeoutMs });
  try {
    const model = await client.models.retrieve(config.model);
    console.log(`Model check: "${model.id}" (${model.display_name}) is available to this API key.`);
  } catch (err) {
    const status = (err as { status?: number }).status;
    console.log(`Model check FAILED for "${config.model}"${status ? ` (HTTP ${status})` : ''}: ${(err as Error).message}`);
    process.exitCode = 1;
    return;
  }

  const service = createMentorService({ ...config, provider: 'claude' });
  if (service.provider.name !== 'claude') throw new Error('Expected the Claude provider');

  let failures = 0;
  for (const c of CASES) {
    const started = Date.now();
    const res = await service.handle(
      new Request('http://localhost/api/mentor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c.request) }),
      'live-check',
    );
    const body = (await res.json()) as { reply?: string; provider?: string; error?: string; message?: string };
    const ms = Date.now() - started;
    console.log(`\n[${c.label}] HTTP ${res.status} in ${ms} ms, provider=${body.provider ?? '-'}`);
    if (res.ok && body.provider === 'claude' && body.reply) console.log(`Reply: ${body.reply}`);
    else {
      failures += 1;
      console.log(`Error: ${body.error ?? 'unknown'} ${body.message ?? ''}`);
    }
  }

  console.log('\nThe [mentor] lines above show tokens per reply; cache_read > 0 means the fixed prompt prefix was served from the prompt cache.');
  console.log(failures === 0 ? '\nLIVE AI VERIFIED: real Claude responses received through the server handler.' : `\nLIVE AI CHECK HAD ${failures} FAILURE(S).`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.log(`Live check crashed: ${(err as Error).name}: ${(err as Error).message}`);
  process.exitCode = 1;
});
