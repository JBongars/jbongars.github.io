export interface HacklasHelpDependencies {
  matchMediaList?: (query: string) => Pick<MediaQueryList, "matches" | "addEventListener">;
}

export type DesktopMedia = Pick<MediaQueryList, "matches" | "addEventListener">;

export interface HelpState {
  lastFocus: HTMLElement | undefined;
  helpItem: HTMLElement | undefined;
  modal: HTMLElement | undefined;
}

export interface HelpContext {
  root: ParentNode;
  state: HelpState;
  media: DesktopMedia | undefined;
}
