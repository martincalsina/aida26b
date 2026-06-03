import type { Response } from 'express';
import { structure } from '../../../shared/src/ssot/structure';
import { getPkFields } from '../../../shared/src/utils/utils';
import type { ColumnDef, TableKey, TableRecordMap } from '../../../shared/src/types/types';

export type ParseResult<T extends TableKey> = { data: TableRecordMap[T] } | { errors: string[] };

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Argentina (America/Argentina/Buenos_Aires) is UTC-3 all year — no daylight saving.
const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;

// Patterns come from the static SSOT, so compile each once and reuse.
const regexCache = new Map<string, RegExp>();
function getRegex(source: string): RegExp {
  let re = regexCache.get(source);
  if (!re) { re = new RegExp(source); regexCache.set(source, re); }
  return re;
}

function offsetText(days: number): string {
  if (days === 0) return 'today';
  return days > 0 ? `${days} day(s) in the future` : `${-days} day(s) in the past`;
}

// Calendar-day key for a bare date value, taken literally (parsed as UTC midnight).
function literalDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Calendar-day key for the day an instant falls on in Argentina's timezone.
function argentinaDay(ms: number): number {
  const local = new Date(ms + ARGENTINA_OFFSET_MS);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

function checkDate(key: string, col: ColumnDef, value: unknown): string | undefined {
  const parsed = new Date(value as string);
  if (isNaN(parsed.getTime())) return `${key} must be a valid date`;

  const day = literalDay(parsed);

  // Relative bounds: min/max are signed offsets in whole calendar days from today (in Argentina's timezone)
  const diffDays = Math.round((day - argentinaDay(Date.now())) / MS_PER_DAY);
  if (typeof col.max === 'number' && diffDays > col.max) {
    return col.max === 0 ? `${key} must not be in the future` : `${key} must be on or before ${offsetText(col.max)}`;
  }
  if (typeof col.min === 'number' && diffDays < col.min) {
    return col.min === 0 ? `${key} must not be in the past` : `${key} must be on or after ${offsetText(col.min)}`;
  }

  return undefined;
}

function checkValue(key: string, col: ColumnDef, value: unknown): string | undefined {
  switch (col.type) {
    case 'string':
      if (typeof value !== 'string') return `${key} must be a string`;
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) return `${key} must be a number`;
      if (col.integer && !Number.isInteger(value)) return `${key} must be an integer`;
      break;
    case 'boolean':
      if (typeof value !== 'boolean') return `${key} must be a boolean`;
      break;
  }

  const isDate = col.type === 'date' || col.input === 'date';
  if (isDate) {
    const dateError = checkDate(key, col, value);
    if (dateError) return dateError;
  }

  if (col.options && !col.options.some((o) => o.value === value)) {
    return `${key} must be one of: ${col.options.map((o) => o.value).join(', ')}`;
  }

  if (col.pattern && (typeof value !== 'string' || !getRegex(col.pattern).test(value))) {
    return col.patternMessage ? `${key} ${col.patternMessage}` : `${key} has an invalid format`;
  }

  // min / max — length for strings, value for numbers (dates consume min/max as day-offsets in checkDate)
  if (!isDate && typeof col.min === 'number') {
    if (typeof value === 'string' && value.length < col.min) return `${key} must be at least ${col.min} characters`;
    if (typeof value === 'number' && value < col.min) return `${key} must be >= ${col.min}`;
  }
  if (!isDate && typeof col.max === 'number') {
    if (typeof value === 'string' && value.length > col.max) return `${key} must be at most ${col.max} characters`;
    if (typeof value === 'number' && value > col.max) return `${key} must be <= ${col.max}`;
  }

  return undefined;
}

function parseTable<T extends TableKey>(table: T, body: unknown, partial: boolean): ParseResult<T> {
  const columns = structure.tables[table].columns as Record<string, ColumnDef>;
  const pkFields = getPkFields(table);
  const b = (body != null && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const errors: string[] = [];
  const data: Record<string, unknown> = {};

  for (const [key, col] of Object.entries(columns)) {
    if (col.editable === false) continue;          // display-only / joined column
    if (partial && pkFields.includes(key)) continue; // PK supplied via query on update

    const raw = b[key];

    if (raw === null) {
      if (col.nullable) { data[key] = null; continue; }
      errors.push(`${key} is required`);
      continue;
    }

    const isMissing = raw === undefined || (col.type === 'string' && raw === '');
    if (isMissing) {
      if (!col.required) continue;
      errors.push(`${key} is required`);
      continue;
    }

    const error = checkValue(key, col, raw);
    if (error) { errors.push(error); continue; }

    data[key] = normalizeValue(col, raw);
  }

  return errors.length > 0 ? { errors } : { data: data as TableRecordMap[T] };
}

export const parseInsert = <T extends TableKey>(table: T, body: unknown): ParseResult<T> =>
  parseTable(table, body, false);

// PK columns come from the query string on update, not the body.
export const parseUpdate = <T extends TableKey>(table: T, body: unknown): ParseResult<T> =>
  parseTable(table, body, true);

function normalizeValue(col: ColumnDef, value: unknown): unknown {
  return col.normalize && typeof value === 'string'
    ? value.replace(getRegex(col.normalize.pattern), col.normalize.replacement)
    : value;
}

// Validate and normalize a single value (e.g. a primary key from the query string).
function parseField<T extends TableKey>(
  table: T,
  column: keyof TableRecordMap[T] & string,
  value: unknown,
): { data: string } | { errors: string[] } {
  const col = (structure.tables[table].columns as Record<string, ColumnDef>)[column];
  if (!col) return { errors: [`${column} is not a valid field`] };

  if (value === undefined || value === null || (col.type === 'string' && value === '')) {
    return { errors: [`${column} is required`] };
  }

  const error = checkValue(column, col, value);
  if (error) return { errors: [error] };

  return { data: String(normalizeValue(col, value)) };
}

// Validate a table's PK columns from a query object, returning them in declared PK order.
export function parsePk<T extends TableKey>(
  table: T,
  query: Record<string, unknown>,
): { data: string[] } | { errors: string[] } {
  const errors: string[] = [];
  const data: string[] = [];

  for (const field of getPkFields(table)) {
    const result = parseField(table, field as keyof TableRecordMap[T] & string, query[field]);
    if ('errors' in result) { errors.push(...result.errors); continue; }
    data.push(result.data);
  }

  return errors.length > 0 ? { errors } : { data };
}

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
