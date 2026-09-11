import type { SiteModule } from "./types";

export type { SiteModule } from "./types";

export function registerModules(modules: SiteModule[]): () => void {
  let teardowns: (() => void)[] = [];

  function stopAll(): void {
    for (const stop of teardowns) {
      stop();
    }
    teardowns = [];
  }

  function startAll(root: ParentNode = document): void {
    stopAll();
    teardowns = modules.map((module) => module.init(root));
  }

  const controller = new AbortController();
  const { signal } = controller;
  startAll();
  document.addEventListener(
    "site:beforenavigate",
    () => {
      stopAll();
    },
    { signal },
  );
  document.addEventListener(
    "site:navigated",
    () => {
      startAll();
    },
    { signal },
  );

  return () => {
    controller.abort();
    stopAll();
  };
}
