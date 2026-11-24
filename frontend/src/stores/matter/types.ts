/** Whose way in a fabric came through, as the bridge wrote it down when it paired. */
export interface MatterPairedVia {
  by: 'page' | 'app';
  vendor_id?: number;
  vendor_name?: string | null;
}

/** Which devices of the bridge the subscriptions of a fabric name, by did. */
export interface MatterWatching {
  all: boolean;
  dids: number[];
  missing: number[];
}

/** The commands of a fabric since the bridge started. */
export interface MatterCommands {
  count: number;
  last_at: number;
  last_did: number;
}

/**
 * What a controller declared when it opened a session. The version is null for one that
 * declared nothing: it is older than Matter 1.3, and that is all the bridge knows.
 */
export interface MatterDeclared {
  version: string | null;
  specification_version: number;
  data_model_revision: number | null;
  interaction_model_revision: number | null;
}

/** For how long the certificate of a pairing holds; no end is null. */
export interface MatterCertificate {
  valid_from: number;
  valid_until: number | null;
}

/** One device a fabric talks to the bridge from. */
export interface MatterFabricDevice {
  // Null until the device said its name, or the bridge saw its MAC.
  name: string | null;
  mac: string | null;
  address: string | null;
  online: boolean;
  subscriptions: number;
  heard_at?: number;
  matter?: MatterDeclared;
}

export type MatterLinkCode = 'online' | 'partly' | 'stale' | 'left' | 'removed' | 'forgot' | 'offline'
  | 'unseen' | 'quiet';

/** What the bridge asked a fabric and what came back; a question nobody put is absent. */
export interface MatterLinkAnswers {
  subscriptions?: number;
  missing?: number;
  report_live?: 'success' | 'invalid' | 'none';
  report_dead?: 'success' | 'invalid' | 'none';
  session?: 'accepted' | 'refused' | 'none';
  ping?: 'answers' | 'silent';
  // Present when the bridge had no session and no address to ask by.
  known?: 'no';
}

/** A check as the three things a person asks; a key is absent while nothing asked can tell. */
export interface MatterLinkSummary {
  in_network?: 'yes' | 'no';
  answers_bridge?: 'yes' | 'no';
  // 'dropped': the fabric refused a subscription the bridge still held.
  holds_subscriptions?: 'yes' | 'no' | 'dropped';
}

/** The verdict of the bridge about the link to a fabric: the code is put into words here. */
export interface MatterLink {
  code: MatterLinkCode;
  says: string;
  checked_at?: number;
  answers?: MatterLinkAnswers;
  summary?: MatterLinkSummary;
}

export interface MatterFabric {
  index: number;
  // The label the fabric gave itself: FabricDescriptorStruct.Label, written by the app
  // that paired. Often empty - half of the controllers never set one.
  adminFabricLabel: string;
  vendor_id: number;
  // The label the operator typed on this controller. It wins over adminFabricLabel,
  // because that one belongs to whoever paired and Matter gives a bridge no way to write
  // it: UpdateFabricLabel is fabric-scoped.
  localFabricLabel?: string;
  // When this app paired, in milliseconds since the epoch. Missing for an app that was
  // already paired before the bridge started keeping dates - then MatterStatus.fabrics_since
  // is what the page can honestly say instead of a blank.
  paired_at?: number;
  // Whether there is an open channel to this app right now. It says a channel exists, not
  // that the app is working or that anybody is looking at it; an app with no channel is
  // not broken either, since ecosystems let them lapse and rebuild them on demand.
  online?: boolean;
  // When the last channel to this app went away. Written only at that moment, so it is
  // missing both for an app that has never dropped and for every app right after the
  // service restarts - see FabricHistory#seen in the bridge.
  last_seen?: number;
  // Everything below is undefined from a bridge older than this page.
  vendor_name?: string | null;
  paired_via?: MatterPairedVia;
  sessions?: number;
  subscriptions?: number;
  heard_at?: number;
  watching?: MatterWatching;
  commands?: MatterCommands;
  devices?: MatterFabricDevice[];
  link?: MatterLink;
  certificate?: MatterCertificate;
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
  // Everything the endpoint carries beside that reading: the brightness of a lamp, as
  // "50 %". Null when there is nothing to add - and undefined when the service is older
  // than this page, which is why every reader of it has a fallback.
  detail?: string | null;
  // Roles of the config this endpoint does not carry: colour, or a brightness channel
  // the driver says cannot be written. The page names them; why, in a sentence, is in
  // the journal of the service, like every other detail kept for support.
  ignored_roles?: string[];
  // The fabrics, by index, that follow other devices and not this one.
  not_followed_by?: number[];
}

export interface MatterDevices {
  // Devices the config gives to Matter, and how many of them reached an endpoint.
  configured: number;
  exposed: number;
  skipped: number;
  config_error: string | null;
  list: MatterDevice[];
}

/**
 * The switches of this page, kept by the bridge. Each is true or false, and a change is
 * applied without a restart of the service.
 */
export interface MatterSettings {
  // The name of a device is given where an app shows its model. On by default: the hub
  // of Aqara names a bridged device by its model and Alice prints the model in the
  // device card, and neither shows the name. See docs/ecosystems.md of
  // wb-mqtt-matter-bridge, finding Я31.
  name_in_model: boolean;
}

/** Why the bridge is not doing its job: a code for the page, a sentence for support. */
export interface MatterProblem {
  code: string;
  reason: string;
  detail?: string;
}

export interface MatterStatus {
  version: string;
  // The clock of the controller at the moment it answered, in milliseconds since the
  // epoch. closes_at is on that clock and the countdown runs in the browser, whose clock
  // is another one: a controller with no time server can be hours away. Undefined from a
  // service older than this page.
  now?: number;
  // Null while all is well, undefined from a service older than this page. With a
  // network error Matter has not started at all, and no button of this page will work.
  network_error?: MatterProblem | null;
  // While the broker is lost the states shown are from before the outage and a command
  // of an app cannot reach a device.
  broker_error?: MatterProblem | null;
  paired: boolean;
  fabrics: MatterFabric[];
  // When this controller started keeping pairing dates, so the page can say "paired
  // before <date>" for an app with no date of its own. Null from a service that keeps
  // none, undefined from one older than this page.
  fabrics_since?: number | null;
  // Null whenever the pairing window is closed, which is how the bridge comes up: a
  // controller out of the box is not pairable until somebody opens the window here.
  // Also null right after pairing, when the window closes on its own.
  pairing: MatterPairing | null;
  devices: MatterDevices;
  // Undefined from a service older than this page, which has no settings to show.
  settings?: MatterSettings;
}
