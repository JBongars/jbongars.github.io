export interface HacklasShortcutsDependencies {
  location?: Pick<Location, "pathname" | "href" | "assign">;
  history?: Pick<History, "back">;
}

export interface ShortcutContext {
  root: ParentNode;
  location: Pick<Location, "pathname" | "href" | "assign">;
  history: Pick<History, "back">;
}
