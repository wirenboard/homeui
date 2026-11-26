// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { SingleDeviceMove } from './single-device-move';

const device = { name: '5 WB-MR6C', mqttId: 'dev-1' } as any;

const targetPortOptions = [
  { label: 'Port 2', value: '/dev/ttyRS485-2' },
  { label: 'Port 3', value: '/dev/ttyRS485-3' },
];

describe('SingleDeviceMove', () => {
  test('moves the device to the first target port by default', () => {
    const onMove = vi.fn();
    render(
      <SingleDeviceMove
        device={device}
        targetPortOptions={targetPortOptions}
        isOpened
        onMove={onMove}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'device-manager.buttons.move' }));

    expect(onMove).toHaveBeenCalledWith(new Map([[device, '/dev/ttyRS485-2']]));
  });

  test('moves the device to the port picked from the dropdown', async () => {
    const onMove = vi.fn();
    render(
      <SingleDeviceMove
        device={device}
        targetPortOptions={targetPortOptions}
        isOpened
        onMove={onMove}
        onClose={vi.fn()}
      />,
    );

    fireEvent.mouseDown(document.querySelector('.dropdown__control')!);
    fireEvent.click(await screen.findByText('Port 3'));
    fireEvent.click(screen.getByRole('button', { name: 'device-manager.buttons.move' }));

    expect(onMove).toHaveBeenCalledWith(new Map([[device, '/dev/ttyRS485-3']]));
  });

  test('disables the confirm button when there is no port to move to', () => {
    render(
      <SingleDeviceMove
        device={device}
        targetPortOptions={[]}
        isOpened
        onMove={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'device-manager.buttons.move' })).toBeDisabled();
  });

  test('calls onClose when cancelled', () => {
    const onClose = vi.fn();
    render(
      <SingleDeviceMove
        device={device}
        targetPortOptions={targetPortOptions}
        isOpened
        onMove={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'modal.labels.cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  test('renders nothing when closed', () => {
    render(
      <SingleDeviceMove
        isOpened={false}
        device={device}
        targetPortOptions={targetPortOptions}
        onMove={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'device-manager.buttons.move' })).not.toBeInTheDocument();
  });
});
