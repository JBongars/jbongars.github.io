export interface StorageLike {
  getItem: (key: string) => string | undefined;
  setItem: (key: string, value: string) => void;
}

export type ClipboardLike = Pick<Clipboard, "writeText">;
export type MatchMediaLike = (query: string) => Pick<MediaQueryList, "matches">;

export interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  text: () => Promise<string>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<FetchResponse>;
