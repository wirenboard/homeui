import type { ReactNode } from 'react';
import type Cell from '@/stores/devices/cell';

export enum ControlId {
  WantedLevel = 'wanted_level',
  ActualLevel = 'actual_level',
  OnOff = 'on_off',
  ErrorStatus = 'error_status',
  Off = 'off',
  RecallMaxLevel = 'recall_max_level',
  LastActed = 'last_acted',
  GoToScene = 'go_to_scene',
}

export interface LevelCellProps {
  cell: Cell;
  reading: Cell;
  name?: string;
  isDisabled?: boolean;
}

export interface ControlCellProps {
  cell: Cell;
  isDisabled: boolean;
  name?: string;
  levelReading?: Cell;
}

export interface PinnedControlsCellDesktopProps {
  cell: Cell;
  isDisabled: boolean;
  levelReading?: Cell;
}

export interface ShowAllButtonProps {
  isExpanded: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}

export interface GearControlsDesktopProps {
  cells: Cell[];
  levelReading?: Cell;
  isDisabled: boolean;
  children?: ReactNode;
}

export interface InstanceControlsDesktopProps {
  cells: Cell[];
  isDisabled: boolean;
  children?: ReactNode;
}

export interface ControlsBottomSheetMobileProps {
  pinnedControls: Cell[];
  levelReading?: Cell;
  peekTitle?: string;
  children: ReactNode;
}

export interface GearControlsMobileProps {
  cells: Cell[];
  levelReading?: Cell;
  isDisabled: boolean;
  peekTitle?: string;
}

export interface InstanceControlsMobileProps {
  cells: Cell[];
  isDisabled: boolean;
  peekTitle?: string;
}

export interface DeviceControlsDesktopProps {
  mqttId?: string;
  isDisabled?: boolean;
  // The scrolling part of the tab, below the pinned controls.
  children?: ReactNode;
}

export interface DeviceControlsMobileProps {
  mqttId?: string;
  isDisabled?: boolean;
  // Replaces the values in the peek line, for controls that only send and read nothing back.
  peekTitle?: string;
}

export interface GearErrorStatusProps {
  mqttId?: string;
}
