import { useMentor } from '../../mentor/MentorProvider';
import { useMentorPersona } from '../../mentor/useMentorPersona';
import { Dialog } from '../ui/Dialog';
import { MentorAvatar } from './MentorAvatar';
import { MentorChat, MentorModeBadge } from './MentorChat';

/** The chat with the chosen mentor: a bottom sheet on phones, a side drawer on larger screens. */
export function MentorPanel() {
  const { isOpen, close } = useMentor();
  const persona = useMentorPersona();
  return (
    <Dialog
      open={isOpen}
      onClose={close}
      title={`Ask ${persona.name}`}
      variant="sheet"
      className="h-[78dvh] md:h-auto"
      initialFocusSelector="#mentor-input"
      titleAdornment={<MentorAvatar size={44} />}
    >
      <div className="px-5 pb-1 sm:px-6">
        <MentorModeBadge />
      </div>
      <MentorChat />
    </Dialog>
  );
}
