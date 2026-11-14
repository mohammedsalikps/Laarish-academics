/** True for a failed download of a code-split chunk (a lazily loaded screen or game). */
export function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(text);
}

/** Reloads the page. Saved progress is already in storage, so nothing is lost. */
export function reloadPage() {
  window.location.reload();
}
