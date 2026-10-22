/** Input validation helpers for learner-entered text. */

export const DISPLAY_NAME_MAX = 20;

export type NameValidation = { ok: true; value: string } | { ok: false; message: string };

/**
 * Nicknames: 2-20 characters of letters (any script), numbers, spaces, hyphens,
 * apostrophes and dots. We ask for a nickname so children never need to enter
 * their full real name.
 */
export function validateDisplayName(raw: string): NameValidation {
  const value = raw.replace(/\s+/g, ' ').trim();
  if (value.length < 2) return { ok: false, message: 'Please use at least 2 letters.' };
  if (value.length > DISPLAY_NAME_MAX) return { ok: false, message: `Please keep it to ${DISPLAY_NAME_MAX} characters or fewer.` };
  if (!/^[\p{L}\p{M}\p{N} .'-]+$/u.test(value)) {
    return { ok: false, message: 'Please use only letters, numbers and spaces.' };
  }
  if (/\d{5,}/.test(value) || /@/.test(value)) {
    return { ok: false, message: 'That looks like personal information. Please choose a fun nickname instead.' };
  }
  return { ok: true, value };
}
