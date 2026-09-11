import type { StorageLike } from "../../platform";

export interface DisclaimerDependencies {
  storage?: StorageLike;
  location?: Pick<Location, "href" | "assign" | "origin" | "pathname">;
  history?: Pick<History, "back">;
  referrer?: string;
}
