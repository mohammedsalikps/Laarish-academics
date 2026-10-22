import { MENTORS, getMentor, type MentorPersona } from '../../shared/mentor/personas';
import { useProgress } from '../state/ProgressProvider';

/**
 * The learner's chosen mentor. Screens inside the app are only reachable after
 * a mentor is chosen (see RequireMentor in App.tsx), so the fallback is only
 * used on screens shown before the choice, which pass a mentor explicitly.
 */
export function useMentorPersona(): MentorPersona {
  const { state } = useProgress();
  return getMentor(state.learner?.mentorId) ?? MENTORS.rishi;
}

/** True once the learner has chosen Rishi or Ayra. */
export function useHasMentor(): boolean {
  const { state } = useProgress();
  return Boolean(getMentor(state.learner?.mentorId));
}
