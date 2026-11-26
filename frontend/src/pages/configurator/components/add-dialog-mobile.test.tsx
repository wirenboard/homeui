// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore } from '@/stores/configurator';
import { fireEvent, render, screen } from '@/test/render';
import { AddDialog } from './add-dialog';

vi.mock('react-responsive', () => ({ useMediaQuery: () => true }));
vi.mock('../utils', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  listDevices: () => ['relay', 'dimmer'],
  deviceControls: (id: string) => [{ id: `${id}/K1`, controlId: 'K1', name: `${id} K1` }],
  deviceTitle: (id: string) => (id === 'relay' ? 'Relay' : 'Dimmer'),
  classifyCell: () => ({ cls: 'bin_rw' }),
  isSystemDevice: () => false,
  isVirtualDevice: () => false,
  formatValue: () => '0',
}));
vi.mock('@/components/dialog', () => ({
  Dialog: ({ children, isOpened }: any) => (isOpened ? <div>{children}</div> : null),
}));

beforeEach(() => {
  runInAction(() => {
    configuratorStore.devices = [];
  });
});

describe('AddDialog on a phone', () => {
  it('shows the controller devices first, then the channels of the picked one, and goes back keeping the picks', () => {
    render(<AddDialog isOpened onAdded={vi.fn()} onClose={vi.fn()} />);
    const channelBoxes = () => screen.queryAllByRole('checkbox', { name: /show-channel/ });
    expect(screen.getByRole('button', { name: /Dimmer/ })).toBeTruthy();
    expect(channelBoxes()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /Dimmer/ }));
    expect(screen.queryByRole('button', { name: /Relay/ })).toBeNull();
    fireEvent.click(channelBoxes()[0]);

    fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.to-controller-devices' }));
    expect(channelBoxes()).toHaveLength(0);
    const picked = screen.getByRole('list', { name: 'configurator.labels.picked-channels' });
    expect(picked.textContent).toBe('dimmer K1 · Dimmer');
  });
});
