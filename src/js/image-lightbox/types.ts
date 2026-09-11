export interface Point {
  x: number;
  y: number;
}

export interface DragOrigin extends Point {
  translateX: number;
  translateY: number;
}

export interface LightboxState {
  scale: number;
  translateX: number;
  translateY: number;
  pointers: Map<number, Point>;
  pinchStartDistribution: number;
  pinchStartScale: number;
  isDragging: boolean;
  isMoved: boolean;
  dragOrigin: DragOrigin | undefined;
  lastTap: number;
  root: HTMLElement;
  stage: HTMLElement;
  image: HTMLImageElement;
  zoomLabel: HTMLElement;
  closeButton: HTMLButtonElement;
}

export interface ActiveLightbox {
  root: HTMLElement;
  trigger: HTMLImageElement;
  session: AbortController;
}

export interface EnhancedImage {
  image: HTMLImageElement;
  role: string | undefined;
  tabIndex: string | undefined;
  zoomable: string | undefined;
  ariaLabel: string | undefined;
  alt: string;
}
