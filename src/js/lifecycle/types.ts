export interface SiteModule {
  init: (root?: ParentNode) => () => void;
}
