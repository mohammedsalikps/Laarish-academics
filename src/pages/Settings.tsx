import { BrandWordmark } from '../components/art/Brand';
import { Check, Coins, Download, Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LANGUAGE_NAMES, REPLY_LANGUAGES } from '../../shared/mentor/types';
import { Avatar } from '../components/art/Avatar';
import { MentorModeBadge } from '../components/mentor/MentorChat';
import { MentorPicker } from '../components/mentor/MentorPicker';
import { useMentorPersona } from '../mentor/useMentorPersona';
import { Dialog } from '../components/ui/Dialog';
import { SAMPLE_CURRICULUM_NOTICE } from '../content';
import { GRADES, type Grade } from '../domain/types';
import { AVATARS, type AvatarDefinition } from '../engine/avatars';
import { REWARD_RULES } from '../engine/rules';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn } from '../lib/cn';
import { DISPLAY_NAME_MAX, validateDisplayName } from '../lib/validation';
import { useMentor } from '../mentor/MentorProvider';
import { useProgress } from '../state/ProgressProvider';
import { useVoices } from '../hooks/usePreferences';
import { SPEECH_LANGUAGE_NAMES, pickVoice } from '../voice/speech';
import { isRecognitionSupported } from '../voice/useSpeechRecognition';
import type { Settings as SettingsType } from '../state/progressTypes';
import { coinBalance } from '../state/selectors';

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-2 font-bold">{label}</p>
      <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-canvas-sunken p-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn('min-h-[44px] rounded-xl px-4 text-sm font-extrabold transition', value === o.value ? 'bg-surface text-primary-strong shadow-soft' : 'text-ink-soft hover:text-ink')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex items-center justify-between gap-4 py-2', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-sm text-ink-muted">{description}</span>
      </span>
      <span className="relative shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="block h-8 w-14 rounded-full bg-ink/15 transition peer-checked:bg-success peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
        <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-soft transition peer-checked:translate-x-6" />
      </span>
    </label>
  );
}

/** Voice: which voices this device has, and the grown-up switch for answering by voice. */
function VoiceSection({ voiceAnswers, onChange }: { voiceAnswers: boolean; onChange: (on: boolean) => void }) {
  const voices = useVoices();
  const synthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const recognition = isRecognitionSupported();
  return (
    <Section title="Voice" description="Laarish can read questions out loud and, if you allow it, listen to spoken answers. Tapping always works too.">
      <p className="text-sm font-bold">Voices on this device</p>
      <ul className="mt-1.5 flex flex-wrap gap-2" aria-label="Voices on this device">
        {(['en', 'hi', 'kn'] as const).map((lang) => {
          const voice = synthesis ? pickVoice(voices, lang) : null;
          return (
            <li key={lang} className={cn('rounded-full px-3 py-1 text-xs font-extrabold', voice ? 'bg-success-soft text-success-strong' : 'bg-canvas-sunken text-ink-muted')}>
              {SPEECH_LANGUAGE_NAMES[lang]}: {voice ? voice.name : 'no voice'}
            </li>
          );
        })}
      </ul>
      <p className="mb-2 mt-1.5 text-xs text-ink-muted">Lines in a language without a voice are not read out; they stay on screen. Voices come from the device and its settings.</p>
      <div className="border-t border-line pt-2">
        <Toggle
          label="Answer quiz questions by voice"
          disabled={!recognition && !voiceAnswers}
          checked={voiceAnswers}
          onChange={onChange}
          description={
            <>
              For grown-ups: adds a microphone button to quizzes. The browser asks for microphone permission the first time it is pressed. Laarish never records or keeps
              audio, and the words heard only pick an answer on this device. The browser turns speech into text: Chrome and Edge send the audio to their own speech service
              (Google or Microsoft) to do this.{' '}
              {recognition ? '' : <strong>This browser does not support voice answers.</strong>}
            </>
          }
        />
      </div>
    </Section>
  );
}

export default function Settings() {
  const persona = useMentorPersona();
  useDocumentTitle('Settings');
  const { state, actions, storageKind } = useProgress();
  const { status } = useMentor();
  const navigate = useNavigate();
  const learner = state.learner!;
  const coins = coinBalance(state);
  const [name, setName] = useState(learner.displayName);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [buying, setBuying] = useState<AvatarDefinition | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const settings = state.settings;
  const set = (changes: Partial<SettingsType>) => actions.updateSettings(changes);

  const saveName = () => {
    const v = validateDisplayName(name);
    if (!v.ok) {
      setNameMsg({ ok: false, text: v.message });
      return;
    }
    actions.updateLearner({ displayName: v.value });
    setName(v.value);
    setNameMsg({ ok: true, text: 'Nickname saved!' });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), progress: state }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laarish-progress-${learner.displayName.replace(/\W+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page max-w-4xl">
      <h1 className="text-3xl font-semibold md:text-4xl">Settings</h1>
      <div className="mt-6 space-y-5">
        <Section title="Your mentor" description="Your mentor helps you in every lesson. Changing mentor keeps all your progress.">
          <MentorPicker value={learner.mentorId ?? null} onChange={(mentorId) => actions.updateLearner({ mentorId })} size="compact" />
        </Section>

        <Section title="Profile" description="Only a nickname and grade are stored. No email, birthday or photo.">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="settings-name" className="font-bold">
                Nickname
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="settings-name"
                  value={name}
                  maxLength={DISPLAY_NAME_MAX + 5}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameMsg(null);
                  }}
                  className="min-h-[48px] w-full rounded-2xl border-2 border-line bg-surface px-4 font-bold outline-none focus:border-primary"
                  aria-describedby="settings-name-msg"
                />
                <button type="button" className="btn btn-primary" onClick={saveName} disabled={name.trim() === learner.displayName}>
                  Save
                </button>
              </div>
              <p id="settings-name-msg" className={cn('mt-1.5 text-sm font-bold', nameMsg?.ok ? 'text-success-strong' : 'text-coral-strong')} role="status">
                {nameMsg?.text}
              </p>
            </div>
            <div>
              <label htmlFor="settings-grade" className="font-bold">
                Class
              </label>
              <select
                id="settings-grade"
                value={learner.grade}
                onChange={(e) => actions.updateLearner({ grade: Number(e.target.value) as Grade })}
                className="mt-2 block min-h-[48px] w-full rounded-2xl border-2 border-line bg-surface px-4 font-bold outline-none focus:border-primary"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Class {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">Avatar</p>
              <span className="chip bg-reward-soft text-reward-strong">
                <Coins className="h-4 w-4" aria-hidden="true" /> {coins} coins
              </span>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {AVATARS.map((a) => {
                const owned = state.ownedAvatars.includes(a.id);
                const active = learner.avatarId === a.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => (owned ? actions.updateLearner({ avatarId: a.id }) : setBuying(a))}
                      aria-pressed={active}
                      aria-label={owned ? `Use the ${a.name} avatar` : `Unlock the ${a.name} avatar for ${a.cost} coins`}
                      className={cn(
                        'relative flex w-full flex-col items-center gap-1 rounded-2xl border-2 p-2 transition',
                        active ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-primary/40',
                      )}
                    >
                      <Avatar id={a.id} size={56} className={cn(!owned && 'grayscale')} />
                      <span className="text-xs font-extrabold">{a.name}</span>
                      {!owned && (
                        <span className="flex items-center gap-0.5 text-[0.7rem] font-bold text-reward-strong">
                          <Lock className="h-3 w-3" aria-hidden="true" /> {a.cost}
                        </span>
                      )}
                      {active && (
                        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-white">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-ink-muted">Coins are earned by learning. They can never be bought with real money.</p>
          </div>
        </Section>

        <Section title="Daily goal">
          <Segmented
            label="XP per day"
            value={String(learner.dailyGoalXp)}
            options={REWARD_RULES.dailyGoal.options.map((g) => ({ value: String(g), label: `${g} XP` }))}
            onChange={(v) => actions.updateLearner({ dailyGoalXp: Number(v) })}
          />
        </Section>

        <Section title="Comfort and accessibility">
          <div className="space-y-5">
            <Segmented
              label="Animations"
              value={settings.motion}
              options={[
                { value: 'system', label: 'Match my device' },
                { value: 'reduce', label: 'Reduce motion' },
                { value: 'full', label: 'Full motion' },
              ]}
              onChange={(motion) => set({ motion })}
            />
            <Segmented
              label="Text size"
              value={settings.textSize}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'large', label: 'Larger' },
              ]}
              onChange={(textSize) => set({ textSize })}
            />
            <div className="divide-y divide-line">
              <Toggle label="Sound effects" description="Gentle sounds for correct answers and rewards." checked={settings.sound} onChange={(sound) => set({ sound })} />
              <Toggle label="Read aloud" description={`${persona.name} reads lines out loud automatically (uses your device's voice).`} checked={settings.readAloud} onChange={(readAloud) => set({ readAloud })} />
            </div>
          </div>
        </Section>

        <VoiceSection voiceAnswers={settings.voiceAnswers} onChange={(voiceAnswers) => set({ voiceAnswers })} />

        <Section title={`${persona.name}'s answers`}>
          <Segmented
            label="My language"
            value={settings.mentorLanguage}
            options={REPLY_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
            onChange={(mentorLanguage) => set({ mentorLanguage })}
          />
          <p className="mb-4 mt-1.5 text-xs text-ink-muted">Used when you tap “Explain it in my language”. Other answers stay in simple English.</p>
          <div className="flex flex-wrap items-center gap-3">
            <MentorModeBadge />
            <p className="text-sm text-ink-soft">
              {status?.provider === 'claude'
                ? `${persona.name} answers using an AI model (${status.model}). Answers can contain mistakes.`
                : status?.backend
                  ? `${persona.name} is in demo mode with prepared answers for the sample lessons. It is not a live AI.`
                  : `The mentor server is not reachable, so ${persona.name} uses prepared demo answers on this device.`}
            </p>
          </div>
        </Section>

        <Section title="Data and privacy" description="Demo mode is not a secure account.">
          <ul className="space-y-2 text-sm text-ink-soft">
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              {storageKind === 'local-demo'
                ? 'Progress is saved in this browser on this device only. Anyone using this browser can see it, and clearing browser data deletes it.'
                : 'Progress is kept in memory only and will be lost when this page closes.'}
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              Mentor conversations are not saved. Only the number of questions asked is counted, for achievements.
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/parents" className="btn btn-secondary btn-sm">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" /> Grown-ups' summary
            </Link>
            <button type="button" className="btn btn-secondary btn-sm" onClick={exportData}>
              <Download className="h-4 w-4" aria-hidden="true" /> Download my progress
            </button>
            <button type="button" className="btn btn-ghost btn-sm text-coral-strong" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset all progress
            </button>
          </div>
        </Section>

        <div className="flex flex-col items-center gap-2 text-center text-xs text-ink-muted">
          <BrandWordmark height={24} />
          <p>Laarish Academics demo v0.1 · {SAMPLE_CURRICULUM_NOTICE}</p>
        </div>
      </div>

      <Dialog open={Boolean(buying)} onClose={() => setBuying(null)} title={buying ? `Unlock ${buying.name}?` : ''}>
        {buying && (
          <div className="flex flex-col items-center px-6 pb-6 pt-2 text-center">
            <Avatar id={buying.id} size={96} />
            {coins >= buying.cost ? (
              <>
                <p className="mt-3 text-ink-soft">
                  This costs <strong className="text-reward-strong">{buying.cost} coins</strong>. You have {coins}.
                </p>
                <div className="mt-5 flex gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => setBuying(null)}>
                    Not now
                  </button>
                  <button
                    type="button"
                    className="btn btn-reward"
                    onClick={() => {
                      actions.purchaseAvatar(buying.id);
                      setBuying(null);
                    }}
                  >
                    <Coins className="h-5 w-5" aria-hidden="true" /> Unlock
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-ink-soft">
                  You need <strong>{buying.cost - coins} more coins</strong>. Finish missions and achievements to earn them!
                </p>
                <button type="button" className="btn btn-primary mt-5" onClick={() => setBuying(null)}>
                  OK
                </button>
              </>
            )}
          </div>
        )}
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} title="Reset all progress?" description="This deletes the explorer, XP, coins, stars and achievements on this device.">
        <div className="px-5 pb-6 pt-3 sm:px-6">
          <label htmlFor="reset-confirm" className="text-sm font-bold">
            Type RESET to confirm
          </label>
          <input
            id="reset-confirm"
            value={resetText}
            onChange={(e) => setResetText(e.target.value)}
            className="mt-2 block min-h-[48px] w-full rounded-2xl border-2 border-line px-4 font-bold uppercase outline-none focus:border-coral"
            autoComplete="off"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn bg-coral text-white shadow-[0_4px_0_rgb(var(--c-coral-strong))]"
              disabled={resetText.trim().toUpperCase() !== 'RESET'}
              onClick={async () => {
                await actions.reset();
                navigate('/', { replace: true });
              }}
            >
              Reset progress
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
