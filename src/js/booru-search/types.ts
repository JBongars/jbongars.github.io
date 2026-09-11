import type { MatchMediaLike } from "../platform";

export interface BooruSearchDependencies {
  matchMedia?: MatchMediaLike;
  location?: Pick<Location, "href">;
}

export type SwatchColor = "blue" | "green" | "purple" | "orange" | "pink";
export type SortMode = "date" | "name";

export interface TagRecord {
  name: string;
  count: number;
  color: SwatchColor;
}

export interface FilterEntry {
  name: string;
  isExcluded: boolean;
  color: SwatchColor;
}

export interface ListFilter {
  selected: FilterEntry[];
  hasChip: (name: string) => boolean;
  didAdd: (name: string, isExcluded: boolean) => boolean;
  removeAt: (index: number) => void;
  didRemoveLast: () => boolean;
  names: (isExcluded: boolean) => string[];
  apply: () => void;
}

export interface TagSearchOptions {
  input?: HTMLInputElement;
  mount?: HTMLElement;
  listboxId?: string;
  placeholder?: string;
  fieldClass?: string;
  commitTagOnSpace?: boolean;
  commitTagOnTab?: boolean;
  commitTagOnEnter?: boolean;
  onInput?: () => void;
}

export interface ResolvedTagSearchOptions {
  listboxId: string;
  placeholder: string;
  fieldClass: string;
  commitTagOnSpace: boolean;
  commitTagOnTab: boolean;
  commitTagOnEnter: boolean;
  onInput: (() => void) | undefined;
}

export interface TagSearchState {
  debounceTimer: ReturnType<typeof setTimeout> | undefined;
  activeIndex: number;
  suggestions: TagRecord[];
  tagIndex: TagRecord[];
  filter: ListFilter;
  options: ResolvedTagSearchOptions;
  wrap: HTMLElement;
  field: HTMLElement;
  input: HTMLInputElement;
  suggest: HTMLElement;
  dropdown: HTMLElement;
  matchMedia: MatchMediaLike;
  signal: AbortSignal;
}

export interface TagSearchConfig {
  tagIndex: TagRecord[];
  filter: ListFilter;
  options: TagSearchOptions;
  matchMedia: MatchMediaLike;
  signal: AbortSignal;
}

export interface MountedTools {
  list: HTMLElement;
  tools: HTMLElement;
}

export interface MountListConfig {
  list: Element;
  matchMedia: MatchMediaLike;
  signal: AbortSignal;
  mounted: MountedTools[];
}

export interface MountFieldConfig {
  list: Element;
  input: HTMLInputElement;
  matchMedia: MatchMediaLike;
  locationLike: Pick<Location, "href">;
  signal: AbortSignal;
}

export interface SortState {
  mode: SortMode;
  direction: number;
}
