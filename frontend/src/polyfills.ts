// Runtime shims for Safari 12-14 (old iPads), which still receives the ESM build — see the
// plugin-legacy setup in vite.config.ts. Syntax lowering and core-js polyfills are handled by the
// build; this file covers only the APIs core-js does not ship.

// WeakRef (Safari 14.1): @floating-ui/react creates them unguarded. A strong reference is an
// acceptable stand-in for the few elements it tracks.
if (typeof WeakRef === 'undefined') {
  (window as any).WeakRef = class StrongRef<T extends object> {
    target: T;

    constructor(target: T) {
      this.target = target;
    }

    deref() {
      return this.target;
    }
  };
}

// ResizeObserver (Safari 13.1): used by dashboards, the console panel and the JSON editor.
// Loaded on demand so modern browsers never download the polyfill.
export const polyfillsReady: Promise<void> = typeof ResizeObserver === 'undefined'
  ? import('@juggle/resize-observer').then((mod) => {
    (window as any).ResizeObserver = mod.ResizeObserver;
  })
  : Promise.resolve();
