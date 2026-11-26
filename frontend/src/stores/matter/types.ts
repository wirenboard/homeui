/** Whose way in a fabric came through, as the bridge wrote it down when it paired. */
export interface MatterPairedVia {
  by: 'page' | 'app';
  vendor_id?: number;
  vendor_name?: string | null;
}

export type MatterWatchingKind = 'all' | 'some' | 'none';

/** Which devices of the bridge the subscriptions of a fabric name, by did. */
export interface MatterWatching {
  all: boolean;
  // How many of the devices given to Matter are followed, and out of how many.
  kind?: MatterWatchingKind;
  of?: number;
  dids: number[];
  missing: number[];
  // What a person calls the devices in `missing`.
  missing_names?: string[];
}

/** One command of a fabric: what it asked of which device, and which controller sent it. */
export interface MatterCommand {
  at: number;
  did: number;
  // The name of that device.
  name?: string;
  // What was written to the controls of the device for it.
  asked: { role: string; value: string }[];
  // A plain switching in one word; null for anything else.
  action?: 'on' | 'off' | null;
  // The controller of the fabric the command came from; null for what it did not tell.
  from: { name: string | null; address: string | null };
}

/** The commands of a fabric since the bridge started. */
export interface MatterCommands {
  count: number;
  last_at: number;
  last_did: number;
  last_name?: string;
  // The last few, newest first. Absent from a bridge that keeps the count alone.
  recent?: MatterCommand[];
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

/**
 * What a device does for its fabric, as the bridge worked it out: holds subscriptions,
 * was the one the fabric was paired from, both, or neither. `paired_alone` is the pairing
 * device of a fabric nobody works for, `silent` any other device of such a fabric.
 */
export type MatterDeviceRole = 'works' | 'works_paired' | 'paired' | 'paired_alone' | 'silent' | 'idle';

/** What the standard calls a device of a fabric by its role. */
export type MatterRoleName = 'controller' | 'commissioner' | 'controller_commissioner';

/** One device a fabric talks to the bridge from. */
export interface MatterFabricDevice {
  // Null until the device said its name, or the bridge saw its MAC.
  name: string | null;
  mac: string | null;
  address: string | null;
  online: boolean;
  subscriptions: number;
  // What this device alone follows. Absent for one with no session.
  watching?: MatterWatching;
  heard_at?: number;
  matter?: MatterDeclared;
  // Absent from a bridge older than this page.
  role?: MatterDeviceRole;
  role_name?: MatterRoleName;
}

export type MatterLabelSource = 'local' | 'admin' | 'vendor' | 'none';

/** What to call a fabric and where that came from; a label typed here carries what it replaced. */
export interface MatterLabel {
  source: MatterLabelSource;
  // Null for a fabric that offers nothing: the page then says its number.
  text: string | null;
  replaced?: MatterLabel;
}

export type MatterPairedKind = 'dated' | 'before' | 'unknown';

/**
 * Passed, something to do, nothing to say. The bridge says the same three of a channel of
 * a device, of the reason a device is not given, of a line of a fabric, and in its counts.
 */
export type MatterOutcome = 'ok' | 'error' | 'off';

// The link to a fabric in one word: on the line; silent, or away with no moment known;
// or the trouble a check of the bridge found.
export type MatterLinkWord = 'online' | 'quiet' | 'away' | 'left' | 'removed' | 'forgot' | 'offline';

// Which of the devices given to Matter a fabric follows. 'nothing' - the bridge gives none;
// 'unknown' - the fabric holds no subscription now and cannot be asked.
export type MatterFollowsKind = 'all' | 'some' | 'none' | 'nothing' | 'unknown';

/** The row of a fabric in three lines, each with how it came out. */
export interface MatterFabricOverview {
  // `since` goes with 'quiet': the moment it went silent.
  link: { status: MatterOutcome; word: MatterLinkWord; since?: number };
  // It follows `followed` of the `of` devices; both absent for 'nothing' and 'unknown'.
  devices: { status: MatterOutcome; kind: MatterFollowsKind; followed?: number; of?: number };
  // Its last command since the bridge started, or null.
  commands: { status: MatterOutcome; last_at: number | null };
}

/** One role of a device of the config, and what became of it in Matter. */
export interface MatterChannel {
  // A role of the configurator, translated through its keys.
  role: string;
  // The control it is read from, as a person names it: "wb-mdm3_11/K1".
  control: string | null;
  status: MatterOutcome;
  // The reading as the bridge formatted it: "on", "50 %". Absent until the control says one.
  text?: string;
  // The same reading as a colour to draw.
  colour?: string;
  // Why the status is not ok, as a code this page puts into words.
  code?: string;
}

export type MatterAnswer = 'yes' | 'no' | 'unknown';

/**
 * Which apps follow a device. The bridge sees only that: an app that follows a device
 * shows it, and one that follows others and not this one did not take it.
 */
export interface MatterFollowedBy {
  // The worst of the answers: one app that did not take a device is the news about it.
  answer: MatterAnswer;
  of: number;
  // Every app by the index of its fabric, in the order of the fabrics. Unknown is an app
  // with no subscription now: it cannot be asked.
  answers: { index: number; answer: MatterAnswer }[];
}

/** What an app is given for a device. */
export interface MatterEndpoint {
  // The name of the Matter device, in the words of Matter: "Dimmable light".
  type: string;
  power: 'wired' | 'battery' | null;
  endpoint: number | null;
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

/** Words the bridge says itself, in both languages of the page. */
export type MatterWords = Record<'ru' | 'en', string>;

/** What the page knows how to do when an advice of the bridge offers it. */
export enum MatterAdviceActionKind {
  Reconnect = 'reconnect',
}

/**
 * What to do about a fabric: the bridge tells the words, the page only prints them.
 * `line` is the line of the row it is about, absent for one that stands only in the
 * details; an action of a `kind` this page does not know is printed without its button.
 */
export interface MatterAdvice {
  code: string;
  line?: 'link' | 'devices';
  text: MatterWords;
  action?: { kind: string; label: MatterWords; confirm: MatterWords };
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
  // Whether the app is on the line, as the bridge counts it: it holds a subscription, or
  // something was heard from it within the last two minutes. An open session alone does
  // not count (М49), and an app that is not on the line is not broken either: ecosystems
  // let subscriptions lapse and make them anew.
  online?: boolean;
  // When the app was last heard before it went quiet. Written by the bridge only at that
  // break and kept in its file over restarts - see FabricHistory#wentQuiet there - so it
  // is missing for an app that has never dropped.
  last_seen?: number;
  // Everything below is undefined from a bridge older than this page.
  label?: MatterLabel;
  paired_kind?: MatterPairedKind;
  // Undefined from a service older than this page.
  overview?: MatterFabricOverview;
  advice?: MatterAdvice[];
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
  // What the QR code encodes. The page does not show it: the picture is drawn by the
  // bridge, and a tool that wants the text reads it from here or from the journal.
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

/**
 * The place of a device in a card of the configurator. What Matter is given as a device -
 * one entry of the config - is to a person a part of what was put together there: the
 * entries of one card. Worked out by the bridge, which also puts the parts of a card
 * together in the list.
 */
export interface MatterCard {
  name: string;
  // One for the whole card, as the configurator keeps it.
  group: string | null;
  parts: number;
  // Whether this device is the first part of its card, and the last: the page names the
  // card at the first and draws no line until the last.
  first: boolean;
  last: boolean;
}

export interface MatterDevice {
  did: number;
  name: string;
  unnamed?: boolean; // the part has no name of its own: `name` is the name of its device
  // Type of the configurator, e.g. switch or temperature_sensor. Translated through the
  // keys of the configurator, so the names of the types live in one place.
  type: string;
  // The card of the configurator this device was made from: a WB device id, or the name
  // of a device composed by hand. Null in a config written by hand.
  module: string | null;
  // What the operator put the device into: `group` of the config. Matter is told it as a room.
  group: string | null;
  // Null for a device with no card, a config written by hand. Undefined from a service
  // older than this page.
  card?: MatterCard | null;
  roles: string[];
  // Whether the device became a Matter endpoint, and why not: the code is what this page
  // puts into words, the sentence is the detail of the service, in English like its
  // journal, kept for support. The status says whether there is something to fix.
  exposed: boolean;
  reason_code: string | null;
  reason: string | null;
  reason_status?: MatterOutcome | null;
  // Every role of the config; the first is the one the device is read by. Undefined, like
  // the two below, from a service older than this page.
  channels?: MatterChannel[];
  // Null, both, for a device that is not exposed.
  matter?: MatterEndpoint | null;
  followed_by?: MatterFollowedBy | null;
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
  // Every part of a device is given to Matter as a device of its own. The one way the
  // bridge has so far: shown as a setting, and named in settings_fixed of the status.
  parts_apart?: boolean;
  // The journal of the service keeps every exchange with an app. Applied at once;
  // undefined from a bridge that takes the level of its journal from a file.
  detailed_journal?: boolean;
}

/** Why the bridge is not doing its job: a code for the page, a sentence for support. */
export interface MatterProblem {
  code: string;
  reason: string;
  detail?: string;
}

// What the bridge says of itself, for the card "About the bridge". Read off the Matter
// node by the bridge, so it is what an app is told.
export interface MatterBridgeAbout {
  name: string;
  matter_version: string | null;
  // When the identifiers the apps know the bridge and its devices by were drawn, on the
  // clock of the controller. Null when the bridge never wrote that down.
  identity_since: number | null;
}

export interface MatterStatus {
  version: string;
  // Undefined from a service older than this page, null while there is no node to read.
  bridge?: MatterBridgeAbout | null;
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
  // The settings that are shown and cannot be changed yet, by name.
  settings_fixed?: string[];
}
