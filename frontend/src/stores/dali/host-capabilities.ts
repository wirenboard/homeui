/**
 * What the app hosting the DALI page can actually do.
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
  /**
   * The daemon can start a WebSocket server emulating a Lunatone DALI-2 IoT
   * Gateway for the DALI Cockpit to connect to — a network server a page
   * running in a browser has no way to open.
   */
  lunatoneEmulator: true,
};
