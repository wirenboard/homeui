import type { ReactNode } from 'react';
import type {
  MatterDevice, MatterDevices, MatterFabric, MatterPairing, MatterSettings,
} from '@/stores/matter';

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
  // The clock of the controller, in milliseconds: the times of the bridge are on it.
  now: number;
  isChecking: boolean;
  hasCheckFailed: boolean;
  onCheck: () => void;
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
  now?: number;
  // The fabric whose link is being checked, by index.
  checkingIndex?: number | null;
  hasCheckFailed?: boolean;
  onCheck?: (_fabric: MatterFabric) => void;
  // Whether a row can be opened into its details: the setting of the page.
  hasDetails?: boolean;
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
