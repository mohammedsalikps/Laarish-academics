/** Routes for the world experience (wireframe S2–S4). The older /subjects routes keep working. */
export function worldPath(subjectId: string): string {
  return `/world/${subjectId}`;
}

export function chapterPathUrl(subjectId: string, lessonId: string): string {
  return `/world/${subjectId}/chapter/${lessonId}`;
}

const RETURN_KEY = 'laarish-academics:return-to-chapter';

/** Remember that a topic was opened from the 3D chapter path (this tab only), so Exit returns there. */
export function rememberChapter(lessonId: string, url: string) {
  try {
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ lessonId, url }));
  } catch {
    // Not remembered: Exit falls back to the lesson roadmap.
  }
}

export function chapterReturnUrl(lessonId: string): string | null {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(RETURN_KEY) ?? 'null') as { lessonId?: string; url?: string } | null;
    return saved?.lessonId === lessonId && typeof saved.url === 'string' && saved.url.startsWith('/world/') ? saved.url : null;
  } catch {
    return null;
  }
}

export function topicSheetUrl(subjectId: string, lessonId: string, topicId: string): string {
  return `/world/${subjectId}/chapter/${lessonId}/topic/${topicId}`;
}
