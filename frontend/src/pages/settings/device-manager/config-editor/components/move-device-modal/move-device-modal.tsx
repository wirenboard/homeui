import { BulkDevicesMove } from './bulk-devices-move';
import { SingleDeviceMove } from './single-device-move';
import { type MoveDeviceModalProps } from './types';
import './styles.css';

export const MoveDeviceModal = ({
  isOpened, currentPort, devices, portOptions = [], onMove, onClose,
}: MoveDeviceModalProps) => {
  const targetPortOptions = portOptions.filter((port) => port.value !== currentPort.path);

  if (devices.length <= 1) {
    return (
      <SingleDeviceMove
        isOpened={isOpened}
        device={devices[0]}
        targetPortOptions={targetPortOptions}
        onMove={onMove}
        onClose={onClose}
      />
    );
  }

  return (
    <BulkDevicesMove
      isOpened={isOpened}
      currentPort={currentPort}
      devices={devices}
      targetPortOptions={targetPortOptions}
      onMove={onMove}
      onClose={onClose}
    />
  );
};
