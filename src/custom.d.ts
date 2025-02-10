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
