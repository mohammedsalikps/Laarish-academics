/** Routes for the world experience (wireframe S2–S4). The older /subjects routes keep working. */
export function worldPath(subjectId: string): string {
  return `/world/${subjectId}`;
}

export function chapterPathUrl(subjectId: string, lessonId: string): string {
  return `/world/${subjectId}/chapter/${lessonId}`;
}

export function topicSheetUrl(subjectId: string, lessonId: string, topicId: string): string {
  return `/world/${subjectId}/chapter/${lessonId}/topic/${topicId}`;
}
