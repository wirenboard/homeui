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

declare const __HIDE_COMPACT_MENU__: boolean;
declare const __LOGO__: string;
declare const __LOGO_COMPACT__: string;
declare const __APP_NAME__: string;
