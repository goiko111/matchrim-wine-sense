
export interface ImportResult {
  success: number;
  errors: string[];
  warnings: string[];
  skipped: number;
  updated: number;
}

export interface CSVRow {
  [key: string]: string;
}

export type DuplicateStrategy = 'skip' | 'update' | 'suffix';

export type ImportType = 'wines' | 'wine_styles' | 'matchrim_profiles';
