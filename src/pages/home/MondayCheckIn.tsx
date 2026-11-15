import { useState } from 'react';
import { MentorPose } from '../../components/mentor/MentorPose';
import { Dialog, DialogBody } from '../../components/ui/Dialog';
import type { SubjectId } from '../../domain/types';
import { updatePrefs, useAcademicsPrefs, weekKey } from '../../state/academicsPrefs';
import type { ClassWorld } from '../world/worldData';
import { checkInDue } from './schoolWeek';


/**
 * Monday check-in (H3): Rishi asks, one subject at a time, whether the class
 * is still on the same chapter. Closing it is fine; it comes back next Monday.
 */
export function MondayCheckIn({ worlds, onMovedOn }: { worlds: ClassWorld[]; onMovedOn: (subjectId: SubjectId, nextLessonId?: string) => void }) {
  const prefs = useAcademicsPrefs();
  const today = new Date();
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);
  const asking = worlds.filter((w) => w.thisWeek);
  const open = !dismissed && checkInDue(today, prefs.checkInWeek, worlds) && index < asking.length;
  const world = asking[index];

  const close = () => {
    updatePrefs({ checkInWeek: weekKey(today) });
    setDismissed(true);
  };

  if (!world?.thisWeek) return null;
  const chapter = world.thisWeek.lesson.title;
  const position = world.chapters.findIndex((c) => c.lesson.id === world.thisWeek!.lesson.id);
  const next = world.chapters.slice(position + 1).find((c) => c.state !== 'coming-soon');

  return (
    <Dialog open={open} onClose={close} title="Monday · new week" hideTitle>
      <DialogBody>
        <div className="flex items-end gap-3">
          <MentorPose pose="think" height={132} className="-mb-2 shrink-0" />
          <div className="min-w-0 pb-2">
            <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-primary">Monday · New week</p>
            <p className="mt-1 font-display text-2xl font-extrabold leading-snug text-ink">New week! Is your class still on {chapter}?</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (index + 1 < asking.length) setIndex(index + 1);
              else close();
            }}
          >
            Yes, still {chapter}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              close();
              onMovedOn(world.subject.id as SubjectId, next?.lesson.id);
            }}
          >
            We moved on
          </button>
        </div>
      </DialogBody>
    </Dialog>
  );
}
