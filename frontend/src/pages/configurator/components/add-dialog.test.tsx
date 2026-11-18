// @vitest-environment happy-dom
import type { Device } from '@/stores/configurator';
import { render, screen } from '@/test/render';
import { AddDialog } from './add-dialog';

const cells = [
  { id: 'relay/K1', controlId: 'K1', name: 'K1' },
  { id: 'relay/K2', controlId: 'K2', name: 'K2' },
];

vi.mock('../utils', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  listDevices: () => ['relay'],
  deviceControls: () => cells,
  deviceTitle: () => 'Relay',
  classifyCell: () => ({ cls: 'bin_rw' }),
  isSystemDevice: () => false,
  isVirtualDevice: () => false,
  formatValue: () => '0',
}));
vi.mock('@/components/dialog', () => ({
  Dialog: ({ children, isOpened }: any) => (isOpened ? <div>{children}</div> : null),
}));

const checkedCount = () =>
  (screen.getAllByRole('checkbox', { name: /show-channel/ }) as HTMLInputElement[])
    .filter((input) => input.checked).length;

describe('AddDialog channel preselection', () => {
  it('preselects the suitable channels when a new device is added', () => {
    render(<AddDialog isOpened onClose={vi.fn()} />);

    expect(checkedCount()).toBe(2);
  });

  it('preselects nothing when channels are added to an existing device', () => {
    const target: Device = { id: 'd', name: 'd', matter: true, alice: true, rows: [] };
    render(<AddDialog target={target} isOpened onClose={vi.fn()} />);

    expect(checkedCount()).toBe(0);
    expect((screen.getByRole('button', { name: 'configurator.buttons.add-channels' }) as HTMLButtonElement).disabled)
      .toBe(true);
  });
});
