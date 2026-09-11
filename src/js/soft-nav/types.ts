import type { FetchLike } from "../platform";

export interface SoftNavDependencies {
  fetch?: FetchLike;
  scrollTo?: (x: number, y: number) => void;
}

export interface LoadedPage {
  doc: Document;
  nextMain: HTMLElement;
}

export interface NavState {
  skeletonTimer: ReturnType<typeof setTimeout> | undefined;
  stuckTimer: ReturnType<typeof setTimeout> | undefined;
  isApplied: boolean;
}
