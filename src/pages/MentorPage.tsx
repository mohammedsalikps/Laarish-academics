import { MentorAvatar } from '../components/mentor/MentorAvatar';
import { MentorChat, MentorModeBadge } from '../components/mentor/MentorChat';
import { getTopic, topicLabel } from '../content';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMentor } from '../mentor/MentorProvider';
import { useMentorPersona } from '../mentor/useMentorPersona';

/** Full-page chat with the chosen mentor (the mobile mentor tab). Uses the learner's current topic as context. */
export default function MentorPage() {
  const persona = useMentorPersona();
  useDocumentTitle(`Ask ${persona.name}`);
  const { context } = useMentor();
  const topic = getTopic(context.topicId);

  return (
    <div className="page !pb-24 md:!pb-10">
      <div className="flex items-center gap-4">
        <MentorAvatar size={64} label={persona.name} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold md:text-4xl">Ask {persona.name}</h1>
            <MentorModeBadge />
          </div>
          <p className="mt-1 text-ink-soft">Ask about {topic ? `“${topicLabel(topic)}”` : 'anything you are learning'}, get a hint, or check how you are doing.</p>
        </div>
      </div>
      <div className="card mt-5 flex h-[min(70dvh,680px)] flex-col overflow-hidden pt-4">
        <MentorChat />
      </div>
    </div>
  );
}
