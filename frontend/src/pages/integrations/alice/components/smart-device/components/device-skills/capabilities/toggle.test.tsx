// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Capability, toggles } from '@/stores/alice';
import { ToggleCapability } from './toggle';

vi.mock('@/stores/alice', async () => {
  const c = await vi.importActual<any>('@/stores/alice/constants');
  return { ...c, aliceStore: {} };
});
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ value, options, onChange, id }: any) => {
    const flat = (options || []).flatMap((o: any) => o.options || [o]);
    return (
      <select
        data-testid={id || 'dropdown'}
        value={value || ''}
        onChange={(e: any) => onChange({ value: e.target.value })}
      >
        {flat.map((o: any) => (
          <option key={o.value} disabled={o.isDisabled} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  },
}));

const makeCapability = (instance: string) => ({
  type: Capability.Toggle,
  mqtt: '/topic',
  parameters: { instance },
});

describe('ToggleCapability', () => {
  const onChange = vi.fn();
  const baseProps = {
    capability: makeCapability('backlight'),
    index: 0,
    capabilities: [makeCapability('backlight')],
    onCapabilityChange: onChange,
  };

  beforeEach(() => vi.clearAllMocks());

  test('renders instance dropdown with current value', () => {
    render(<ToggleCapability {...baseProps} />);
    const select = screen.getByRole('combobox');
    expect((select as HTMLSelectElement).value).toBe('backlight');
  });

  test('renders all toggle instances as options', () => {
    render(<ToggleCapability {...baseProps} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(toggles.length);
  });

  test('disables already used instances', () => {
    const caps = [makeCapability('backlight'), makeCapability('mute')];
    render(
      <ToggleCapability
        capability={caps[0]}
        capabilities={caps}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const muteOption = screen.getByRole('option', { name: 'mute' }) as HTMLOptionElement;
    expect(muteOption.disabled).toBe(true);
  });

  test('current instance is not disabled', () => {
    render(<ToggleCapability {...baseProps} />);
    const opt = screen.getByRole('option', { name: 'backlight' }) as HTMLOptionElement;
    expect(opt.disabled).toBe(false);
  });

  test('calls onCapabilityChange on instance change', () => {
    render(<ToggleCapability {...baseProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mute' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ parameters: expect.objectContaining({ instance: 'mute' }) }),
      ]),
    );
  });

  test('renders label', () => {
    render(<ToggleCapability {...baseProps} />);
    expect(screen.getByText('alice.labels.mode')).toBeDefined();
  });
});
