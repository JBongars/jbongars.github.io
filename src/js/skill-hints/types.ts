export interface SkillHintDependencies {
  matchMedia?: (query: string) => Pick<MediaQueryList, "matches">;
}

export interface HintPanel {
  root: HTMLElement;
  titleLink: HTMLAnchorElement;
  bodyElement: HTMLElement;
}
