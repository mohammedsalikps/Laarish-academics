import { Check } from 'lucide-react';
import { TOPIC_STEPS, type TopicStep } from '../../domain/types';
import { cn } from '../../lib/cn';

const STEP_LABELS: Record<TopicStep, string> = { watch: 'Learn', play: 'Play', practice: 'Practice' };

/** Compact Watch / Play / Practice completion chips for a topic. */
export function StepDots({ done }: { done: TopicStep[] }) {
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`Steps done: ${done.length} of 3`}>
      {TOPIC_STEPS.map((s) => (
        <span
          key={s}
          className={cn('rounded-full px-1.5 py-0.5 text-[0.65rem] font-extrabold', done.includes(s) ? 'bg-success-soft text-success-strong' : 'bg-canvas-sunken text-ink-muted')}
        >
          {done.includes(s) && <Check className="mr-0.5 inline h-2.5 w-2.5" aria-hidden="true" />}
          {STEP_LABELS[s]}
        </span>
      ))}
    </span>
  );
}
