export interface FuzzyFindLocation {
  href: string;
  pathname: string;
  search: string;
}

export interface FuzzyFindDependencies {
  location?: FuzzyFindLocation;
  history?: Pick<History, "replaceState" | "back">;
}

export interface FieldScores {
  exact: number;
  prefix: number;
  contains: number;
}

export interface NoteFields {
  title: string;
  slug: string;
  path: string;
  tags: string;
}

export interface RankedRow {
  item: HTMLElement;
  score: number;
}

export interface FuzzySession {
  host: ParentNode;
  root: HTMLElement;
  input: HTMLInputElement;
  list: HTMLElement;
  listActive: number;
  location: FuzzyFindLocation;
  history: Pick<History, "replaceState" | "back">;
}

export interface HydrateContext {
  host: ParentNode;
  signal: AbortSignal;
  dependencies: FuzzyFindDependencies;
}
