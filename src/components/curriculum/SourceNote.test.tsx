import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getLesson, getTopic } from '../../content';
import type { Lesson } from '../../domain/types';
import { SourceNote, reviewText } from './SourceNote';

describe('where a lesson comes from, said honestly', () => {
  it('never claims a teacher review that has not happened', () => {
    expect(reviewText(undefined)).toBe('awaiting teacher review');
    expect(reviewText({ teacher: 'pending' })).toBe('awaiting teacher review');
    expect(reviewText({ teacher: 'pending', nativeSpeaker: 'pending' })).toBe('awaiting teacher and native-speaker review');
    expect(reviewText({ teacher: 'done' })).toBe('reviewed by a teacher');
    expect(reviewText({ teacher: 'done', nativeSpeaker: 'pending' })).toBe('reviewed by a teacher; awaiting native-speaker review');
  });

  it('shows a Magnets topic as a Laarish original with the checked section and pages, still awaiting review', () => {
    const lesson = getLesson('magnets')!;
    render(<SourceNote lesson={lesson} topic={getTopic('magnets-directions')!} />);
    const line = screen.getByText(/^Laarish original lesson, mapped to NCERT Curiosity, Class 6, “Exploring Magnets” \(2026-27\)/);
    expect(line).toHaveTextContent('section 4.3 Finding Directions, pages 65-67 (checked 16 Nov 2026)');
    expect(line).toHaveTextContent(/awaiting teacher review$/);
    expect(line).not.toHaveTextContent(/certified|approved|reviewed by a teacher/i);
  });

  it('says "by chapter title" for a topic that was not checked against the chapter text', () => {
    const lesson = { ...getLesson('magnets')!, review: { teacher: 'pending' } } as Lesson;
    render(<SourceNote lesson={lesson} topic={{}} />);
    expect(screen.getByText(/by chapter title · awaiting teacher review$/)).toBeInTheDocument();
  });
});
