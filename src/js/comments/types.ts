export interface CommentsDependencies {
  postMessage?: (iframe: HTMLIFrameElement, data: unknown, origin: string) => void;
}

export interface CommentFields {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  term: string;
}
