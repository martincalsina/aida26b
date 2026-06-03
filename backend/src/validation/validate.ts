import type { Response } from 'express';

// The framework-agnostic validation core is shared with the frontend.
export * from '../../../shared/src/validation/validate';

// Responds 400 and returns true when the result holds errors; the predicate narrows it to `{ data }` otherwise.
export function sendErrorsIfInvalid<T>(
  res: Response,
  result: { data: T } | { errors: string[] },
): result is { errors: string[] } {
  if ('errors' in result) {
    res.status(400).json({ error: result.errors.join('; ') });
    return true;
  }
  return false;
}
