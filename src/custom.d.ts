declare module '*.svg' {
  import React = require('react');

  interface CustomSVGProps extends React.SVGProps<SVGSVGElement> {
    title?: string;
    className?: string;
  }

  export const ReactComponent: React.FC<CustomSVGProps>;
  const src: React.FC<CustomSVGProps>;
  export default src;
}
