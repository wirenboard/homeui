// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Capability, modeInstances } from '@/stores/alice';
import { ModeCapability } from './mode';

vi.mock('@/stores/alice', async () => {
  const c = await vi.importActual<any>('@/stores/alice/constants');
  return { ...c, aliceStore: {} };
});
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ value, options, onChange }: any) => {
    const flat = (options || []).flatMap((o: any) => o.options || [o]);
    return (
      <select
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
vi.mock('@/components/input', () => ({
  Input: ({ value, onChange, isInvalid, title }: any) => (
    <input
      aria-invalid={isInvalid || undefined}
      title={title}
      value={value ?? ''}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, disabled }: any) => (
    <button disabled={disabled} onClick={onClick}>{label}</button>
  ),
}));
vi.mock('@/assets/icons/move.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));
vi.mock('react-sortablejs', () => ({
  ReactSortable: ({ children }: any) => <div data-testid="sortable">{children}</div>,
}));

const makeModeCapability = (
  instance = 'cleanup_mode',
  modes: any[] = [],
) => ({
  type: Capability.Mode,
  mqtt: '/mode',
  parameters: { instance, modes },
});

describe('ModeCapability', () => {
  const onChange = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  test('renders instance dropdown', () => {
    const cap = makeModeCapability();
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    expect(screen.getByText('alice.labels.function-type')).toBeDefined();
    const selects = screen.getAllByRole('combobox');
    expect((selects[0] as HTMLSelectElement).value).toBe('cleanup_mode');
  });

  test('renders all mode instances as options', () => {
    const cap = makeModeCapability();
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const options = screen.getAllByRole('combobox')[0].querySelectorAll('option');
    expect(options).toHaveLength(modeInstances.length);
  });

  test('renders add mode button', () => {
    const cap = makeModeCapability();
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    expect(screen.getByText('alice.buttons.add-mode')).toBeDefined();
  });

  test('add mode creates new mode entry', () => {
    const cap = makeModeCapability('cleanup_mode', []);
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('alice.buttons.add-mode'));
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.modes).toHaveLength(1);
    expect(updated.parameters.modes[0].mqtt_value_match).toBe('0');
  });

  test('add mode picks first recommended value', () => {
    const cap = makeModeCapability('cleanup_mode', []);
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('alice.buttons.add-mode'));
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.modes[0].value).toBe('auto');
  });

  test('delete mode removes entry', () => {
    const modes = [
      { value: 'auto', mqtt_value_match: '0' },
      { value: 'eco', mqtt_value_match: '1' },
    ];
    const cap = makeModeCapability('cleanup_mode', modes);
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const deleteButtons = screen.getAllByRole('button')
      .filter((b) => !b.textContent?.includes('add'));
    fireEvent.click(deleteButtons[0]);
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.modes).toHaveLength(1);
  });

  test('instance change updates parameters', () => {
    const cap = makeModeCapability('cleanup_mode', []);
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const instanceSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(instanceSelect, { target: { value: 'fan_speed' } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.instance).toBe('fan_speed');
  });

  test('mqtt value match validation shows error for invalid chars', () => {
    const modes = [{ value: 'auto', mqtt_value_match: 'ABC!' }];
    const cap = makeModeCapability('cleanup_mode', modes);
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    const mqttInput = inputs.find((i) => i.getAttribute('aria-invalid'));
    expect(mqttInput).toBeDefined();
    expect(mqttInput?.getAttribute('title')).toBe('alice.labels.mqtt-value-match-hint');
  });

  test('mqtt value match shows duplicate error', () => {
    const modes = [
      { value: 'auto', mqtt_value_match: 'same' },
      { value: 'eco', mqtt_value_match: 'same' },
    ];
    const cap = makeModeCapability('cleanup_mode', modes);
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const invalidInputs = screen.getAllByRole('textbox')
      .filter((i) => i.getAttribute('title') === 'alice.labels.mqtt-value-match-duplicate');
    expect(invalidInputs.length).toBeGreaterThan(0);
  });

  test('mode value change propagates', () => {
    const modes = [{ value: 'auto', mqtt_value_match: '0' }];
    const cap = makeModeCapability('cleanup_mode', modes);
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const modeSelects = screen.getAllByRole('combobox');
    fireEvent.change(modeSelects[1], { target: { value: 'eco' } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.modes[0].value).toBe('eco');
  });

  test('renders mode labels for first row', () => {
    const modes = [{ value: 'auto', mqtt_value_match: '0' }];
    const cap = makeModeCapability('cleanup_mode', modes);
    render(
      <ModeCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    expect(screen.getByText('alice.labels.mode-value')).toBeDefined();
    expect(screen.getByText('alice.labels.mqtt-value-match')).toBeDefined();
  });

  test('disables used mode instances', () => {
    const caps = [
      makeModeCapability('cleanup_mode'),
      makeModeCapability('fan_speed'),
    ];
    render(
      <ModeCapability
        capability={caps[0]}
        capabilities={caps}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const opt = screen.getByRole('option', { name: 'fan_speed' }) as HTMLOptionElement;
    expect(opt.disabled).toBe(true);
  });
});
