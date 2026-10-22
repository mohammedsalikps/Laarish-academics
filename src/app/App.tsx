import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { MentorPanel } from '../components/mentor/MentorPanel';
import { getLesson, getTopic, preloadTopicContent } from '../content';
import { PageSkeleton, SplashScreen } from '../components/ui/PageSkeleton';
import { useReducedMotion } from '../hooks/usePreferences';
import { isMentorId } from '../../shared/mentor/personas';
import { lessonPath, topicPath } from '../lib/paths';
import { MentorProvider } from '../mentor/MentorProvider';
import type { ProgressRepository } from '../state/persistence';
import { ProgressProvider, useProgress } from '../state/ProgressProvider';
import { RewardFeed } from './RewardFeed';

// Screens are code-split so the first load stays small.
const Welcome = lazy(() => import('../pages/Welcome'));
const Onboarding = lazy(() => import('../pages/Onboarding'));
const ChooseMentor = lazy(() => import('../pages/ChooseMentor'));
const Home = lazy(() => import('../pages/Home'));
const Subjects = lazy(() => import('../pages/Subjects'));
const SubjectRoadmap = lazy(() => import('../pages/SubjectRoadmap'));
const LessonRoadmap = lazy(() => import('../pages/LessonRoadmap'));
const LegacyClassRedirect = lazy(() => import('../pages/LegacyClassRedirect'));
const TopicPlayerPage = lazy(() => import('../pages/topic/TopicPlayerPage'));
const Achievements = lazy(() => import('../pages/Achievements'));
const ProgressPage = lazy(() => import('../pages/ProgressPage'));
const Settings = lazy(() => import('../pages/Settings'));
const Parents = lazy(() => import('../pages/Parents'));
const MentorPage = lazy(() => import('../pages/MentorPage'));
const NotFound = lazy(() => import('../pages/NotFound'));

/** Applies motion and text-size preferences to the document. */
function DocumentPreferences() {
  const { state } = useProgress();
  const reduce = useReducedMotion();
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.motion = reduce ? 'reduce' : 'full';
    html.dataset.text = state.settings.textSize;
  }, [reduce, state.settings.textSize]);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

/** Old /learn/:id links (before lessons were split into topics) land on the matching roadmap. */
function LegacyLearnRedirect() {
  const { id } = useParams();
  const lesson = getLesson(id);
  const topic = getTopic(id);
  const to = lesson ? lessonPath(lesson.subjectId, lesson.id) : topic ? topicPath(topic) : '/subjects';
  return <Navigate to={to} replace />;
}

/** The topic player, with the topic's subject content downloading alongside the player's code. */
function TopicRoute() {
  const subjectId = getTopic(useParams().topicId)?.subjectId;
  useEffect(() => {
    if (subjectId) preloadTopicContent(subjectId);
  }, [subjectId]);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TopicPlayerPage />
    </Suspense>
  );
}

/**
 * Routes that need a learner profile redirect to the welcome screen when there
 * is none, and to the mentor choice when the profile has no mentor yet, so the
 * chosen mentor is always known inside the app.
 */
function RequireLearner({ children, needsMentor = true }: { children: ReactNode; needsMentor?: boolean }) {
  const { state, ready } = useProgress();
  const location = useLocation();
  if (!ready) return <SplashScreen />;
  if (!state.learner) return <Navigate to="/" replace />;
  if (needsMentor && !isMentorId(state.learner.mentorId)) return <Navigate to="/choose-mentor" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/start" element={<Onboarding />} />
        <Route
          path="/choose-mentor"
          element={
            <RequireLearner needsMentor={false}>
              <ChooseMentor />
            </RequireLearner>
          }
        />
        <Route
          element={
            <RequireLearner>
              <AppShell />
            </RequireLearner>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/subjects/:subjectId" element={<SubjectRoadmap />} />
          {/* Old class and branch pages: the overview now shows each class's roadmap. */}
          <Route path="/subjects/:subjectId/levels/:levelId" element={<LegacyClassRedirect />} />
          <Route path="/subjects/:subjectId/levels/:levelId/:branchId" element={<LegacyClassRedirect />} />
          <Route path="/subjects/:subjectId/:lessonId" element={<LessonRoadmap />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/parents" element={<Parents />} />
          <Route path="/mentor" element={<MentorPage />} />
        </Route>
        <Route
          path="/subjects/:subjectId/:lessonId/:topicId"
          element={
            <RequireLearner>
              <TopicRoute />
            </RequireLearner>
          }
        />
        <Route path="/learn/:id" element={<LegacyLearnRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export function App({ repository }: { repository: ProgressRepository }) {
  return (
    <ProgressProvider repository={repository}>
      <MentorProvider>
        <DocumentPreferences />
        <ScrollToTop />
        <AppRoutes />
        <MentorPanel />
        <RewardFeed />
      </MentorProvider>
    </ProgressProvider>
  );
}
