// Width modes: mobile up to 767, tablet 768–1023, laptop 1024–1365, desktop from 1366.
// Reference devices and reasoning: docs/breakpoints.md. Keep in sync with breakpoints.css.
// Use MIN_* only with minWidth and MAX_* only with maxWidth.

// iPad portrait (768) starts the tablet mode, where content gets the desktop layout.
export const MAX_MOBILE_WIDTH = 767;
export const MIN_TABLET_WIDTH = 768;
// iPad landscape (1024) gets the side menu, it still leaves content 799+ px.
export const MAX_TABLET_WIDTH = 1023;
export const MIN_LAPTOP_WIDTH = 1024;
// Laptop 1366×768 has room for the console on the right and side-by-side panels.
export const MAX_LAPTOP_WIDTH = 1365;
export const MIN_DESKTOP_WIDTH = 1366;
