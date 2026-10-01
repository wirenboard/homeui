import { type FirmwareUpdateStore } from './store';

export interface FirmwareUpdateProps {
  store: FirmwareUpdateStore;
  mode: 'reset' | 'update';
  className?: string;
}

export interface UploadProgressProps {
  store: FirmwareUpdateStore;
}

export interface FirmwareUpdateWidgetProps {
  store: FirmwareUpdateStore;
  mode: 'reset' | 'update';
  className: string;
}

export enum ModalMode {
  Update = 'update',
  UpdateReset = 'update_reset',
  FactoryReset = 'factory_reset',
}

export interface UploadWidgetProps {
  store: FirmwareUpdateStore;
  mode: 'reset' | 'update';
  onSetMode: (mode: ModalMode) => void;
}

/** A log line with its position as `seq`: the update log is append-only, so the index is stable. */
export interface SequencedFirmwareLogLine {
  seq: number;
  line: string;
}
