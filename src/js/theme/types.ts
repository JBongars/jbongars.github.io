import type { StorageLike } from "../platform";

export interface ThemeDependencies {
  storage?: StorageLike;
}

export type Theme = "light" | "dark";
