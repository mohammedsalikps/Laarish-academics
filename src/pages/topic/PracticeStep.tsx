import { ArrowRight, Check, ChevronDown, Lightbulb, MessageCircle, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import type { MentorIntent } from '../../../shared/mentor/types';
import { AnswerChoices } from '../../components/quiz/AnswerChoices';
import { ComicPanel } from '../../components/quiz/ComicPanel';
import { VoiceAnswer } from '../../components/quiz/VoiceAnswer';
import type { QuizAnswer, QuizQuestion } from '../../domain/types';
import { passMastery } from '../../engine/progression';
import { REWARD_RULES } from '../../engine/rules';
import { useReducedMotion, useSound } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { lessonPath } from '../../lib/paths';
import { useMentor } from '../../mentor/MentorProvider';
import { useMentorPersona } from '../../mentor/useMentorPersona';
import { answerForKey, correctAnswerText } from '../../quiz/answerText';
import { finishLine, reaction, welcomeLine } from '../../quiz/comicLines';
import { createQuizReducer, createQuizState, creditFor, isAnswerComplete, quizSummary, type QuestionProgress, type QuizFeedback } from '../../quiz/quizLogic';
import { useProgress } from '../../state/ProgressProvider';
import { canAnswerByVoice } from '../../voice/matchAnswer';
import { questionSpeech } from '../../voice/speech';
import { isRecognitionSupported } from '../../voice/useSpeechRecognition';
import { StepFooter, StepHeading, type StepViewProps } from './shared';

/** The answer as curriculum ids, for the mentor (the server checks it against the answer key). */
function answerId(answer: QuizAnswer | undefined): string | undefined {
  if (answer?.type === 'single-choice') return answer.optionId;
  if (answer?.type === 'true-false') return String(answer.value);
  return undefined;
}

/**
 * Step 3: Practice as a one-on-one comic conversation with the chosen mentor.
 * The mentor welcomes the learner, asks one question at a time, reacts to each
 * answer (praise, a hint and another try, or the answer explained), and
 * celebrates at the end. Questions, answer keys, hints and explanations come
 * from the curriculum and are checked by the app; scoring is unchanged (two
 * tries, full marks first time, half marks with a hint or second try).
 */
export function PracticeStep({ subject, lesson, topic, completed, practice, onNext, onBack, setMentorExtras }: StepViewProps) {
  const questions = topic.practice.questions;
  const reducer = useMemo(() => createQuizReducer(questions), [questions]);
  const [quiz, dispatch] = useReducer(reducer, questions, createQuizState);
  const [started, setStarted] = useState(false);
  const { state, actions } = useProgress();
  const persona = useMentorPersona();
  const play = useSound();
  const submitted = useRef(false);
  const question = questions[quiz.index];
  const summary = quizSummary(questions, quiz);
  const readAloud = state.settings.readAloud;

  // Record the attempt exactly once when the learner reaches the end.
  useEffect(() => {
    if (quiz.phase !== 'summary' || submitted.current) return;
    submitted.current = true;
    actions.quizResult(topic.id, summary);
    play('reward');
  }, [quiz.phase, actions, topic.id, summary, play]);

  // The mentor knows which question is on screen (ids only; the server reads the question itself).
  const questionId = quiz.phase === 'summary' || !started ? undefined : question?.id;
  useEffect(() => {
    setMentorExtras({ quiz: questionId ? { questionId } : undefined, lastMistake: undefined });
  }, [questionId, setMentorExtras]);

  const restart = () => {
    submitted.current = false;
    dispatch({ type: 'restart' });
  };

  const toggleReadAloud = () => {
    if (readAloud && typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    actions.updateSettings({ readAloud: !readAloud });
  };

  const header = (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <StepHeading title="Practice" subtitle={practice ? 'Practice round: try for a higher score!' : `${questions.length} questions with ${persona.name}, one at a time.`} />
      <div className="mb-4 flex items-center gap-2">
        {started && quiz.phase !== 'summary' && <ProgressDots questions={questions} progress={quiz.progress} index={quiz.index} />}
        <button
          type="button"
          onClick={toggleReadAloud}
          aria-pressed={readAloud}
          className={cn(
            'inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border px-3 text-sm font-extrabold shadow-soft',
            readAloud ? 'border-primary bg-primary-soft text-primary-strong' : 'border-line bg-surface text-ink-soft',
          )}
        >
          {readAloud ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
          <span>Read aloud</span>
        </button>
      </div>
    </div>
  );

  if (!started) {
    const intro = welcomeLine(persona, topic, questions.length);
    return (
      <div>
        {header}
        <section aria-label="Welcome" className="card p-4 sm:p-6">
          <ComicPanel key="welcome" speak={intro}>
            <p className="font-display text-lg font-semibold leading-snug sm:text-2xl">{intro}</p>
          </ComicPanel>
          <div className="mt-5 flex justify-center">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setStarted(true)} autoFocus>
              <Play className="h-5 w-5" aria-hidden="true" /> Let's start!
            </button>
          </div>
        </section>
        <StepFooter onBack={onBack} onContinue={onNext} canContinue={completed} continueLabel={completed ? 'Skip to results' : 'Continue'} hint={`Answer all ${questions.length} questions to finish.`} />
      </div>
    );
  }

  if (quiz.phase === 'summary') {
    const pct = Math.round(summary.score * 100);
    const pass = passMastery(topic);
    const line = finishLine(summary.score, summary.score >= pass);
    return (
      <div>
        {header}
        <section className="card p-4 sm:p-6" aria-label="Practice results">
          <ComicPanel key="finish" mood={summary.score >= pass ? 'cheer' : 'speak'} speak={`Practice complete! ${line} You scored ${pct} percent.`}>
            <p className="font-display text-2xl font-semibold">Practice complete!</p>
            <p className="mt-1 font-semibold">{line}</p>
            <p className="mt-1 text-ink-soft">
              You scored <strong className="text-ink">{pct}%</strong>, with {summary.correctFirstTry} of {summary.total} right on the first try.
            </p>
          </ComicPanel>
          {topic.watch.keyIdeas.length > 0 && (
            <div className="mt-5 rounded-3xl bg-reward-soft/60 p-4">
              <p className="flex items-center gap-2 font-extrabold">
                <Lightbulb className="h-5 w-5 text-reward-strong" aria-hidden="true" /> Remember
              </p>
              <ul className="mt-1.5 space-y-1">
                {topic.watch.keyIdeas.slice(0, 2).map((idea) => (
                  <li key={idea} className="text-[0.98rem]">
                    {idea}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Answers questions={questions} progress={quiz.progress} />
          <p className="mt-3 text-sm text-ink-muted">
            Right first time = full marks. Right with a hint or on the second try = half marks. Topic mastery of {Math.round(pass * 100)}% or more unlocks the next topic.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" onClick={restart}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
            <Link to={lessonPath(subject.id, lesson.id)} className="btn btn-ghost">
              Back to the lesson
            </Link>
          </div>
        </section>
        <StepFooter onBack={onBack} onContinue={onNext} canContinue continueLabel="See my rewards" />
      </div>
    );
  }

  return (
    <div>
      {header}
      <QuestionScreen
        key={question.id}
        question={question}
        index={quiz.index}
        total={questions.length}
        progress={quiz.progress[question.id]}
        feedback={quiz.feedback}
        subjectId={topic.subjectId}
        voiceAnswers={state.settings.voiceAnswers}
        onHint={() => dispatch({ type: 'use-hint' })}
        onSubmit={(answer) => {
          const next = reducer(quiz, { type: 'submit', answer });
          dispatch({ type: 'submit', answer });
          play(next.feedback === 'correct' ? 'correct' : 'incorrect');
          setMentorExtras({ quiz: { questionId: question.id, answer: answerId(answer), answerShown: next.feedback === 'revealed' || undefined } });
        }}
        onNext={() => dispatch({ type: 'next' })}
      />
      <StepFooter
        onBack={onBack}
        onContinue={onNext}
        canContinue={completed}
        continueLabel={completed ? 'Skip to results' : 'Continue'}
        hint={`Answer all ${questions.length} questions to finish. You get ${REWARD_RULES.quiz.maxAttempts} tries each.`}
      />
    </div>
  );
}

function ProgressDots({ questions, progress, index }: { questions: QuizQuestion[]; progress: Record<string, QuestionProgress>; index: number }) {
  return (
    <ol className="flex gap-1.5" aria-label="Question progress">
      {questions.map((q, i) => {
        const p = progress[q.id];
        const credit = creditFor(p);
        return (
          <li
            key={q.id}
            aria-label={`Question ${i + 1}: ${p.status === 'unanswered' ? (i === index ? 'current' : 'not answered') : p.status === 'correct' ? 'correct' : 'answer shown'}`}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold',
              p.status === 'unanswered' && i === index && 'bg-primary text-white ring-4 ring-primary/20',
              p.status === 'unanswered' && i !== index && 'bg-canvas-sunken text-ink-muted',
              credit >= 1 && 'bg-success text-white',
              credit > 0 && credit < 1 && 'bg-reward text-ink',
              p.status === 'revealed' && 'bg-coral-soft text-coral-strong',
            )}
          >
            {p.status === 'correct' ? <Check className="h-4 w-4" aria-hidden="true" /> : p.status === 'revealed' ? <X className="h-4 w-4" aria-hidden="true" /> : i + 1}
          </li>
        );
      })}
    </ol>
  );
}

/** One question: the mentor asks, the learner answers (tap, keys or voice), the mentor reacts. */
function QuestionScreen({
  question,
  index,
  total,
  progress,
  feedback,
  subjectId,
  voiceAnswers,
  onHint,
  onSubmit,
  onNext,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  progress: QuestionProgress;
  feedback: QuizFeedback;
  subjectId: StepViewProps['topic']['subjectId'];
  voiceAnswers: boolean;
  onHint: () => void;
  onSubmit: (answer: QuizAnswer) => void;
  onNext: () => void;
}) {
  const persona = useMentorPersona();
  const mentor = useMentor();
  const [draft, setDraft] = useState<QuizAnswer | null>(null);
  const resolved = progress.status !== 'unanswered';
  const headingRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();
  const choices = question.type === 'single-choice' ? question.options.map((o) => o.text) : question.type === 'true-false' ? ['True', 'False'] : [];
  const spoken = questionSpeech(question.prompt, question.type === 'single-choice' ? choices : []);
  const hintOnly = progress.usedHint && !resolved && feedback !== 'retry';
  const said = feedback ? reaction(subjectId, feedback, progress, index, question, correctAnswerText(question)) : null;
  const voice = voiceAnswers && isRecognitionSupported() && canAnswerByVoice(question) && !resolved;

  // A new question takes focus, so keyboard and screen-reader users start at the question.
  useEffect(() => {
    if (index > 0) headingRef.current?.focus();
  }, [index]);

  // The mentor's reaction (or hint) appears below the choices: bring it into view on small screens.
  const reactionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!feedback && !progress.usedHint) return;
    reactionRef.current?.scrollIntoView?.({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [feedback, progress.attempts, progress.usedHint, reducedMotion]);

  const submit = () => {
    if (!isAnswerComplete(question, draft)) return;
    onSubmit(draft);
    // Keep matching choices so they can be adjusted; clear single answers.
    if (question.type !== 'match-pairs') setDraft(null);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (resolved || e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest('input, textarea')) return;
    if (e.key === 'Enter' && isAnswerComplete(question, draft) && (e.target as HTMLElement).getAttribute('role') !== 'radio') {
      e.preventDefault();
      submit();
      return;
    }
    const picked = answerForKey(question, e.key);
    if (picked) {
      e.preventDefault();
      setDraft(picked);
    }
  };

  const ask = (intent: MentorIntent) => mentor.open({ intent });

  return (
    <section aria-label={`Question ${index + 1} of ${total}`} className="card p-4 sm:p-6" onKeyDown={onKeyDown}>
      <ComicPanel key={`ask-${question.id}`} speak={spoken}>
        <p className="eyebrow mb-1">
          Question {index + 1} of {total}
        </p>
        <h3 ref={headingRef} tabIndex={-1} className="font-display text-[1.3rem] font-semibold leading-snug focus:outline-none md:text-2xl">
          {question.prompt}
        </h3>
      </ComicPanel>

      <div className="mt-5" aria-describedby={`${uid}-keys`}>
        <AnswerChoices question={question} draft={draft} last={progress.lastAnswer} resolved={resolved} retry={feedback === 'retry'} onChange={setDraft} />
        <p id={`${uid}-keys`} className="sr-only">
          {question.type === 'single-choice' ? 'Press A, B, C or D to choose, then Enter to check.' : question.type === 'true-false' ? 'Press T for true or F for false, then Enter to check.' : ''}
        </p>
      </div>

      <div ref={reactionRef} aria-live="polite" className="mt-4 space-y-3">
        {hintOnly && (
          <ComicPanel key={`hint-${question.id}`} figure="face" mood="think" speak={`Hint: ${question.hint}`}>
            <p className="flex items-start gap-2 font-semibold">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" />
              <span>
                <span className="sr-only">Hint: </span>
                {question.hint}
              </span>
            </p>
          </ComicPanel>
        )}
        {said && (
          <ComicPanel key={`said-${question.id}-${progress.attempts}`} figure="face" mood={said.mood} speak={`${said.title} ${said.body}`}>
            <p className={cn('font-display text-lg font-semibold leading-snug', said.mood === 'cheer' ? 'text-success-strong' : said.mood === 'think' ? 'text-reward-strong' : 'text-primary-strong')}>
              {said.title}
            </p>
            <p className="mt-1 text-ink-soft">{said.body}</p>
            <button
              type="button"
              className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 text-left text-sm font-extrabold text-primary hover:underline"
              onClick={() => ask(feedback === 'retry' ? 'hint' : feedback === 'revealed' ? 'mistake' : 'example')}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {feedback === 'retry' ? `Ask ${persona.name} for another hint` : feedback === 'revealed' ? `Ask ${persona.name} to explain more` : `Ask ${persona.name} for a real-life example`}
            </button>
          </ComicPanel>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {resolved ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={onNext} autoFocus>
            {index === total - 1 ? 'Finish' : 'Next question'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-success btn-lg" disabled={!isAnswerComplete(question, draft)} onClick={submit}>
              Check answer
            </button>
            {!progress.usedHint && feedback !== 'retry' && (
              <button type="button" className="btn btn-ghost" onClick={onHint}>
                <Lightbulb className="h-5 w-5 text-reward" aria-hidden="true" /> Need a hint?
              </button>
            )}
          </>
        )}
      </div>
      {voice && (
        <div className="mt-3">
          <VoiceAnswer question={question} onChoose={setDraft} />
        </div>
      )}
    </section>
  );
}

/** The end-of-quiz list: how each question went. Collapsed, so the celebration stays the focus. */
function Answers({ questions, progress }: { questions: QuizQuestion[]; progress: Record<string, QuestionProgress> }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mt-4">
      <button type="button" className="btn btn-ghost btn-sm min-h-[44px] px-2" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        Every question <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <ul id={id} hidden={!open} className="mt-2 space-y-2">
        {questions.map((q, i) => {
          const p = progress[q.id];
          const credit = creditFor(p);
          return (
            <li key={q.id} className="flex items-start gap-3 rounded-2xl bg-canvas px-4 py-3">
              <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white', credit >= 1 ? 'bg-success' : credit > 0 ? 'bg-reward' : 'bg-coral')}>
                {credit > 0 ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="text-[0.95rem]">
                <span className="font-bold">
                  {i + 1}. {q.prompt}
                </span>
                <span className="block text-sm text-ink-muted">
                  {credit >= 1 ? 'Right first time' : credit > 0 ? (p.usedHint ? 'Right with a hint' : 'Right on the second try') : `Answer shown. ${q.explanation}`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
