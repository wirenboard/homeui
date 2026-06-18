// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Capability } from '@/stores/alice';
import { DeviceCapabilities } from './device-capabilities';

vi.mock('@/stores/alice', async () => {
  const c = await vi.importActual<any>('@/stores/alice/constants');
  return { ...c, aliceStore: {} };
});
vi.mock('@/stores/devices', () => ({
  devicesStore: {
    topics: [{ label: 'Group', options: [{ label: '/wb/temp', value: '/wb/temp' }] }],
  },
}));
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, disabled, className }: any) => (
    <button className={className} disabled={disabled} onClick={onClick}>{label}</button>
  ),
}));
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ value, options, onChange, id }: any) => {
    const flat = (options || []).flatMap((o: any) => o.options || [o]);
    return (
      <select
        data-testid={id || 'dropdown'}
        value={value || ''}
        onChange={(e: any) => onChange({ value: e.target.value })}
      >
        {flat.map((o: any, i: number) => (
          <option key={`${o.value}-${i}`} disabled={o.isDisabled} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  },
}));
vi.mock('./capabilities', () => ({
  OnOffCapability: () => <div data-testid="onoff-fields" />,
  ColorSettingCapability: () => <div data-testid="color-fields" />,
  ModeCapability: () => <div data-testid="mode-fields" />,
  RangeCapability: () => <div data-testid="range-fields" />,
  ToggleCapability: () => <div data-testid="toggle-fields" />,
  getAvailableModeInstances: () => ['cleanup_mode'],
  getAvailableToggleInstances: () => ['backlight'],
  getAvailableRangeInstances: () => ['brightness'],
  getAvailableColorModels: () => ['color_model'],
  RANGE_LIMITS_DEFAULT: { min: 0, max: 100, precision: 1 },
  RANGE_LIMITS_LOCKED: { brightness: { min: 0, max: 100, precision: 1 } },
}));

const makeCapability = (type: Capability, mqtt = '/topic', params = {}) => ({
  type, mqtt, parameters: params,
});

describe('DeviceCapabilities', () => {
  const onChange = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  test('renders title and description', () => {
    render(<DeviceCapabilities capabilities={[]} onCapabilityChange={onChange} />);
    expect(screen.getByText('alice.labels.device-capabilities')).toBeDefined();
    expect(screen.getByText('alice.labels.device-capabilities-description')).toBeDefined();
  });

  test('renders add button', () => {
    render(<DeviceCapabilities capabilities={[]} onCapabilityChange={onChange} />);
    expect(screen.getByText('alice.buttons.add-capability')).toBeDefined();
  });

  test('add button adds capability with default parameters', () => {
    render(<DeviceCapabilities capabilities={[]} onCapabilityChange={onChange} />);
    fireEvent.click(screen.getByText('alice.buttons.add-capability'));
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ mqtt: '' })]),
    );
  });

  test('renders On/Off sub-component', () => {
    const caps = [makeCapability(Capability['On/Off'])];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    expect(screen.getByTestId('onoff-fields')).toBeDefined();
  });

  test('renders Range sub-component', () => {
    const caps = [makeCapability(Capability.Range, '/r', { instance: 'brightness' })];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    expect(screen.getByTestId('range-fields')).toBeDefined();
  });

  test('renders Mode sub-component', () => {
    const caps = [makeCapability(Capability.Mode, '/m', { instance: 'cleanup_mode' })];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    expect(screen.getByTestId('mode-fields')).toBeDefined();
  });

  test('renders Toggle sub-component', () => {
    const caps = [makeCapability(Capability.Toggle, '/t', { instance: 'backlight' })];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    expect(screen.getByTestId('toggle-fields')).toBeDefined();
  });

  test('renders Color setting sub-component', () => {
    const caps = [makeCapability(Capability['Color setting'], '/c', { color_model: 'rgb' })];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    expect(screen.getByTestId('color-fields')).toBeDefined();
  });

  test('renders capability type labels', () => {
    const caps = [makeCapability(Capability['On/Off'])];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    expect(screen.getByText('alice.labels.capability')).toBeDefined();
    expect(screen.getByText('alice.labels.topic')).toBeDefined();
  });

  test('delete removes capability from list', () => {
    const caps = [
      makeCapability(Capability['On/Off'], '/a'),
      makeCapability(Capability.Range, '/b'),
    ];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    const deleteButtons = screen.getAllByRole('button')
      .filter((b) => !b.textContent);
    fireEvent.click(deleteButtons[0]);
    expect(onChange).toHaveBeenCalledWith([caps[1]]);
  });

  test('capability type change generates correct params for On/Off', () => {
    const caps = [makeCapability(Capability.Range, '/a', { instance: 'brightness' })];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: Capability['On/Off'] } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.type).toBe(Capability['On/Off']);
    expect(updated.parameters.instance).toBe('on');
  });

  test('topic change updates mqtt value', () => {
    const caps = [makeCapability(Capability['On/Off'], '/old')];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: '/wb/temp' } });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ mqtt: '/wb/temp' }),
    ]);
  });

  test('renders multiple capability rows', () => {
    const caps = [
      makeCapability(Capability['On/Off'], '/a'),
      makeCapability(Capability.Range, '/b', { instance: 'brightness' }),
    ];
    render(<DeviceCapabilities capabilities={caps} onCapabilityChange={onChange} />);
    expect(screen.getByTestId('onoff-fields')).toBeDefined();
    expect(screen.getByTestId('range-fields')).toBeDefined();
  });
});
