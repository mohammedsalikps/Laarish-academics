import { useProgress } from '../../state/ProgressProvider';

export type RishiPose = 'stand' | 'wave' | 'point' | 'thumbs-up' | 'build' | 'cheer' | 'think';

/**
 * The learner's mentor as a library cutout (wireframe page 1, "Rishi poses").
 * Rishi has the approved pose set; Ayra uses her single full-length cutout.
 */
export function MentorPose({ pose, height = 120, className, alt = '' }: { pose: RishiPose; height?: number; className?: string; alt?: string }) {
  const { state } = useProgress();
  const ayra = state.learner?.mentorId === 'ayra';
  const src = ayra ? '/mentors/ayra.webp' : `/mentors/rishi-poses/rishi-${pose}.webp`;
  return <img src={src} alt={alt} height={height} style={{ height, width: 'auto' }} className={className} draggable={false} decoding="async" />;
}
