import type { AlignmentStatus, CurriculumSource, Grade, IconKey, Lesson, SubjectId } from '../types.js';

/** A lesson before it is placed in a class and branch. `grades` defaults to the class. */
export type LessonSeed = Omit<Lesson, 'order' | 'subjectId' | 'levelId' | 'branchId' | 'grades'> & { grades?: Lesson['grades'] };

/** Stable id of a class level, e.g. "class-4". */
export const classLevelId = (grade: Grade) => `class-${grade}`;

/** Lessons of one branch within one class, in order (`order` is the position in the branch). */
export function classBranch(subjectId: SubjectId, grade: Grade, branchId: string, seeds: LessonSeed[]): Lesson[] {
  return seeds.map((s) => ({ ...s, grades: s.grades ?? [grade, grade] })).map((s, i) => ({ ...s, subjectId, levelId: classLevelId(grade), branchId, order: i + 1 }));
}

/**
 * A lesson that is planned but not written yet. It appears as "coming soon"
 * and never counts as playable.
 */
export function planned(id: string, title: string, summary: string, icon: IconKey, source?: CurriculumSource): LessonSeed {
  return { id, title, summary, intro: summary, icon, status: 'in-development', topicIds: [], source, proposed: source ? source.status === 'proposed' : true };
}

/** Where a lesson's learning objectives come from (NCERT unless another framework is named). */
export function source(o: { framework?: string; document: string; grade: Grade; academicYear: string; unit?: string; status: AlignmentStatus; verification: string }): CurriculumSource {
  return { ...o, framework: o.framework ?? 'NCERT' };
}
