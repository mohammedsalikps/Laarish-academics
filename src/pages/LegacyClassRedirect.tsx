import { Navigate, useParams } from 'react-router-dom';
import { getBranch, getLevel, getSubject, legacyLevelToClass } from '../content';
import { subjectPath } from '../lib/paths';
import { useProgress } from '../state/ProgressProvider';
import NotFound from './NotFound';

/**
 * Links saved before the subject overview showed the class roadmap directly:
 * /subjects/:subject/levels/:class and /subjects/:subject/levels/:class/:branch
 * open the overview at that class (scrolled to the branch). Grade-band ids from
 * before classes (level-1 … level-3) open the learner's class within the band.
 */
export default function LegacyClassRedirect() {
  const { subjectId, levelId, branchId } = useParams();
  const { state } = useProgress();
  const subject = getSubject(subjectId);
  if (!subject) return <NotFound />;
  const classId = getLevel(subject.id, levelId)?.id ?? legacyLevelToClass(levelId, state.learner?.grade);
  if (!classId || !getLevel(subject.id, classId)) return <NotFound />;
  const branch = branchId ? getBranch(subject.id, branchId) : undefined;
  if (branchId && !branch) return <NotFound />;
  return <Navigate to={subjectPath(subject.id, classId, branch?.id)} replace />;
}
