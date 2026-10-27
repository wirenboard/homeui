export interface ZoomableImageProps {
  src: string;
  alt: string;
  /** Sizes the frame from outside: max-width and max-height of the image area. */
  className?: string;
}

export type ImageState = 'loading' | 'loaded' | 'failed';
