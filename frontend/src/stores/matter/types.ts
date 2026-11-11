export interface MatterFabric {
  index: number;
  label: string;
  vendor_id: number;
}

export interface MatterPairing {
  // When the window closes, in milliseconds since the epoch. The page counts down to
  // it: a code with no visible end looks like a code that lasts forever, which is the
  // thing this whole mechanism exists to stop.
  closes_at: number;
  // The code to type in by hand, without the grouping dashes the apps print.
  manual_code: string;
  // What the QR code encodes. Shown as text for an app that asks for it.
  payload: string;
  // Tag of the payload for the picture URL: the payload itself is a credential and must
  // not end up in a query string.
  qr_version: string;
}

/** What POST /pair and POST /pair/close answer. Never the code itself. */
export interface MatterWindow {
  ok: boolean;
  closes_at: number | null;
}

export interface MatterDevice {
  did: number;
  name: string;
  // Type of the configurator, e.g. switch or temperature_sensor. Translated through the
  // keys of the configurator, so the names of the types live in one place.
  type: string;
  // The card of the configurator this device was made from: a WB device id, or the name
  // of a device composed by hand. Null in a config written by hand.
  module: string | null;
  area: string | null;
  roles: string[];
  // Whether the device became a Matter endpoint. The first slice of the bridge takes
  // on/off devices only, and these say why a device stayed out: the code is what this
  // page puts into words, the sentence is the detail of the service, in English like its
  // journal, kept for support.
  exposed: boolean;
  reason_code: string | null;
  reason: string | null;
  // The value of the bound control, as the bridge last saw it.
  state: 'on' | 'off' | null;
}

export interface MatterDevices {
  // Devices the config gives to Matter, and how many of them reached an endpoint.
  configured: number;
  exposed: number;
  skipped: number;
  config_error: string | null;
  list: MatterDevice[];
}

export interface MatterStatus {
  version: string;
  paired: boolean;
  fabrics: MatterFabric[];
  // Null whenever the pairing window is closed, which is how the bridge comes up: a
  // controller out of the box is not pairable until somebody opens the window here.
  // Also null right after pairing, when the window closes on its own.
  pairing: MatterPairing | null;
  devices: MatterDevices;
}
