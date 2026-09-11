import type { ClipboardLike } from "../platform";

export interface CodeBlockDependencies {
  clipboard?: ClipboardLike;
  viewportHeight?: () => number;
  scrollBy?: (x: number, y: number) => void;
}

export interface IconSet {
  copy: SVGSVGElement;
  check: SVGSVGElement;
  expand: SVGSVGElement;
  close: SVGSVGElement;
}

export interface CopySession {
  clipboard: ClipboardLike;
  icons: IconSet;
  signal: AbortSignal;
  timers: Set<ReturnType<typeof setTimeout>>;
}

export interface FullscreenState {
  root: HTMLElement;
  trigger: HTMLElement | undefined;
}

export interface FullscreenRequest {
  lang: string;
  text: string;
  sourceCode: Element;
  preClass: string;
  codeClass: string;
  lines: number;
  trigger: HTMLElement;
}

export interface FullscreenChrome {
  root: HTMLElement;
  backdrop: HTMLElement;
  closeButton: HTMLElement;
  trigger: HTMLElement;
}

export interface EnhanceSession extends CopySession {
  viewportHeight: () => number;
  scrollBy: (x: number, y: number) => void;
  wrappers: HTMLElement[];
  inlineCodes: HTMLElement[];
  fullscreen: FullscreenState | undefined;
  fullscreenController: AbortController | undefined;
}

export interface FullscreenToolbar {
  bar: HTMLDivElement;
  closeButton: HTMLButtonElement;
}

export interface FullscreenButtonDetails {
  block: HTMLElement;
  sourceCode: Element;
  language: string;
  lines: number;
}

export interface InlineCopy {
  code: HTMLElement;
  text: string;
  session: CopySession;
}
