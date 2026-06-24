/**
 * Standard Server Action result envelope: `{ ok, data, error }`.
 *
 * Every server action returns one of these so the client can branch on a single
 * discriminant without try/catch around `useActionState`/`useTransition`.
 */

export type ActionSuccess<T> = {
  ok: true;
  data: T;
  error: null;
};

export type ActionFailure = {
  ok: false;
  data: null;
  /** Human-readable, already localised message safe to surface to the user. */
  error: string;
  /** Optional machine code for client-side branching. */
  code?: string;
  /** Optional per-field validation messages keyed by form field. */
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function ok<T>(data: T): ActionSuccess<T> {
  return { ok: true, data, error: null };
}

export function fail(
  error: string,
  opts?: { code?: string; fieldErrors?: Record<string, string[]> },
): ActionFailure {
  return { ok: false, data: null, error, code: opts?.code, fieldErrors: opts?.fieldErrors };
}
