import { structure } from "../ssot/structure";

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  date: Date;
};

type MyTypeNames = keyof TypeMap;

type ColumnDef = {
  type: MyTypeNames;
  label?: string;
  input?: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'select';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  editable?: boolean;
  readonlyOnEdit?: boolean;
  nullable?: boolean;
  min?: number;            // string: min length; number: min value; date: earliest day-offset from today (e.g. -30 = 30 days ago, 0 = not in the past)
  max?: number;            // string: max length; number: max value; date: latest day-offset from today (e.g. 0 = not in the future, 7 = up to 7 days ahead)
  integer?: boolean;       // number must be an integer
  pattern?: string;        // regex source the value must match
  patternMessage?: string; // human-readable message when pattern fails
  normalize?: { pattern: string; replacement: string }; // regex find/replace applied to canonicalize the stored value
}

type TableStructure = {
  columns: Record<string, ColumnDef>
  pk: string | string[]
  uiName: string
  title?: string
  addButtonLabel?: string
}

type InferType<FieldDefs extends Record<string, ColumnDef>> = {
  [K in keyof FieldDefs]: TypeMap[FieldDefs[K]['type']]
}

type TableKey = keyof typeof structure.tables;

type TableRecordMap = {
  [T in keyof typeof structure.tables]: InferType<(typeof structure.tables)[T]['columns']>
};

export type {TypeMap, MyTypeNames, ColumnDef, TableStructure, InferType, TableKey, TableRecordMap};