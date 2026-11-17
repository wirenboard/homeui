import type { MatterFabric } from '@/stores/matter';

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
