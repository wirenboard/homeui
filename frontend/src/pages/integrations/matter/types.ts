import type { ReactNode } from 'react';
import type {
  MatterDeclared, MatterDevice, MatterDevices, MatterFabric, MatterPairing, MatterSettings,
} from '@/stores/matter';

export enum WatchingKind {
  None = 'none',
  All = 'all',
  Some = 'some',
}

/** Which devices of the bridge a fabric follows, counted against the ones Matter has. */
export interface WatchedDevices {
  kind: WatchingKind;
  count: number;
  of: number;
  // The names of the devices it does not follow.
  missing: string[];
}

/** One Matter the devices of a fabric declared, and which of them did. */
export interface DeclaredMatter {
  key: string;
  matter: MatterDeclared;
  names: string[];
}

export interface DetailsSectionProps {
  title: string;
  children: ReactNode;
}

export interface DetailsFactsProps {
  // A label and what stands beside it.
  rows: ReadonlyArray<readonly [string, ReactNode]>;
}

export interface FabricDetailsProps {
  fabric: MatterFabric;
  // For the names of the devices the bridge refers to by did.
  devices: MatterDevice[];
  // The clock of the controller, in milliseconds: the times of the bridge are on it.
  now: number;
  isChecking: boolean;
  hasCheckFailed: boolean;
  onCheck: () => void;
}

/**
 * What the page can honestly say about when an app paired. Three cases and not two: an
 * app paired before this controller started keeping dates has no date of its own, and
 * "before <date>" is true where a blank would read like a defect.
 */
export enum PairedDateKind {
  Dated = 'dated',
  Before = 'before',
  Unknown = 'unknown',
}

/**
 * What the page can say about the channel to an app. Quiet is separate from Offline
 * because the bridge only writes the time of a break down, so after a restart of the
 * service every app is Offline with no time to show - which is the usual case, not a
 * fault.
 */
export enum LinkState {
  Online = 'online',
  Quiet = 'quiet',
  Offline = 'offline',
}

/**
 * Which of the four sources the label on screen came from. The page marks the first one,
 * because a label chosen here should not look like one the app sent, and names the last
 * one so two unlabelled fabrics can still be told apart.
 */
export enum FabricLabelSource {
  Local = 'local',
  Admin = 'admin',
  Vendor = 'vendor',
  None = 'none',
}

export enum FabricMenuAction {
  SetLocalFabricLabel = 'set-local-fabric-label',
  Unpair = 'unpair',
}

export interface FabricMenuProps {
  // Shown as the heading of the menu: an overflow menu opens away from its row, and
  // without it there is nothing saying which fabric the two actions will hit.
  label: string;
  fabric: MatterFabric;
  onChoose: (_action: FabricMenuAction) => void;
}

export interface FabricsCardProps {
  fabrics: MatterFabric[];
  // When this controller started keeping pairing dates, for the fabrics that have no date
  // of their own. Null or undefined from a service that keeps none.
  fabricsSince?: number | null;
  onAction: (_fabric: MatterFabric, _action: FabricMenuAction) => void;
  devices?: MatterDevice[];
  now?: number;
  // The fabric whose link is being checked, by index.
  checkingIndex?: number | null;
  hasCheckFailed?: boolean;
  onCheck?: (_fabric: MatterFabric) => void;
}

export interface PairingWindowProps {
  // The open window as the bridge reports it, or null while it is closed.
  pairing: MatterPairing | null;
  // No fabric is paired yet: the closed window is then an invitation and not a remark.
  isEmpty: boolean;
  // How many devices the bridge gives away, for the invitation to say what the first
  // fabric will get - and that it will get nothing while none is picked.
  devicesCount: number;
  // What is left of an open window, as the text to show.
  left: string;
  isChanging: boolean;
  hasFailed: boolean;
  // The last window ran out of time with nobody added: said, or the code just vanishes.
  hasExpired: boolean;
  // Matter has not started, so the button cannot help and says why instead.
  isOffline: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export interface DevicesCardProps {
  devices: MatterDevices;
  onOpen: (_device: MatterDevice) => void;
  // For the names of the fabrics that did not take a device.
  fabrics?: MatterFabric[];
}

export interface FabricLabelDialogProps {
  // The fabric being labelled, or null while the dialog is closed. A snapshot taken when
  // the menu was used, so a poll of the store cannot change it mid-edit.
  fabric: MatterFabric | null;
  onClose: () => void;
}

export interface CopyFieldProps {
  label: string;
  // Shown as it is printed by the smart home apps, the manual code grouped with dashes.
  text: string;
  // Put in the clipboard: the apps expect the manual code without the grouping dashes.
  value: string;
}

export interface SettingsCardProps {
  // As the bridge holds them: the switch shows this and not what was clicked. Undefined
  // from a bridge older than this page, and then the card has no switch.
  settings?: MatterSettings;
  isSaving: boolean;
  hasFailed: boolean;
  onChange: (_settings: Partial<MatterSettings>) => void;
  // The line about the pairing code is drawn only when there is a way to change it.
  onNewCode?: () => void;
  // False while a fabric is being added: the bridge will not change the code then.
  canChangeCode?: boolean;
  isCodeBusy?: boolean;
}
