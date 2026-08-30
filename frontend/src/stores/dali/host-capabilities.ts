/**
 * What the app hosting the DALI page can actually do.
 *
 * NOT observable on purpose: hosts flip these once at startup, before the
 * first render — a runtime mutation would not re-render observers.
 *
 * The page runs in two homes: homeui on a controller, and the standalone WASM
 * device editor in a browser. Some controls only mean something on a
 * controller — "Save to syslog" needs a syslog to save to. The controller
 * host leaves the defaults; the WASM host switches off what it cannot honor
 * (see the editor's main.tsx).
 */
export const daliHostCapabilities = {
  /** wb-mqtt-dali can copy bus monitor rows to the controller's syslog. */
  syslogMonitor: true,
};
