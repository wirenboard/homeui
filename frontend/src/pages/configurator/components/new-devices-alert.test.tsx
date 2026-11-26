// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import { NewDevicesAlert } from './new-devices-alert';

vi.mock('../utils', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  listDevices: () => ['relay', 'sensor'],
  deviceControls: () => [{ id: 'x/K1', controlId: 'K1', name: 'K1' }],
  classifyCell: () => ({ cls: 'bin_rw' }),
  isVirtualDevice: () => false,
}));

describe('NewDevicesAlert', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports the controller devices that are not set up and opens the add dialog by the button', () => {
    const onConfigure = vi.fn();
    render(<NewDevicesAlert onConfigure={onConfigure} />);

    expect(screen.getByText('configurator.labels.new-devices-count')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.configure' }));

    expect(onConfigure).toHaveBeenCalledTimes(1);
  });

  it('disappears for good after it is closed', () => {
    const { unmount } = render(<NewDevicesAlert onConfigure={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button').at(-1));
    unmount();

    render(<NewDevicesAlert onConfigure={vi.fn()} />);

    expect(screen.queryByText('configurator.labels.new-devices-count')).toBeNull();
  });
});
