declare module '*.svg' {
  import { FC, SVGProps } from 'react';

  interface CustomSVGProps extends SVGProps<SVGSVGElement> {
    title?: string;
    className?: string;
  }

  export const ReactComponent: FC<CustomSVGProps>;
  const src: FC<CustomSVGProps>;
  export default src;
}

declare module '*.css' {}

// json-editor reads window.DOMPurify to render HTML in descriptions.
interface Window {
  DOMPurify: typeof import('dompurify').default;
}

declare const __HIDE_COMPACT_MENU__: boolean;
declare const __LOGO__: string;
declare const __LOGO_COMPACT__: string;
declare const __APP_NAME__: string;
declare const __APP_SHORT_NAME__: string;

// raw-text imports (vite ?raw suffix) used by the TS language service
declare module '*?raw' {
  const text: string;
  export default text;
}

// vite provides import.meta.glob; the project compiles without vite/client types, so declare the subset used
interface ImportMeta {
  glob(
    pattern: string,
    options: { query: string; import: string; eager: true }
  ): Record<string, string>;
}
