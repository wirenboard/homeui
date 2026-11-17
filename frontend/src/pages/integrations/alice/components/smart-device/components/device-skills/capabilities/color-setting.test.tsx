// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Capability, Color, ColorModel } from '@/stores/alice';
import { ColorSettingCapability } from './color-setting';

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
  Input: ({ value, onChange, onChangeEvent, id }: any) => (
    <input
      data-testid={id || 'input'}
      value={String(value ?? '')}
      onChange={(e: any) => {
        if (onChangeEvent) {
          const num = parseFloat(e.target.value) || 0;
          onChangeEvent({ currentTarget: { valueAsNumber: num } });
        } else if (onChange) {
          onChange(e.target.value);
        }
      }}
    />
  ),
}));

const makeColorModel = (model = ColorModel.RGB) => ({
  type: Capability['Color setting'],
  mqtt: '/color',
  parameters: { color_model: model, instance: model },
});

const makeTemperature = (min = 2700, max = 6500) => ({
  type: Capability['Color setting'],
  mqtt: '/temp',
  parameters: { temperature_k: { min, max }, instance: 'temperature_k' },
});

const makeColorScene = (scenes: string[] = []) => ({
  type: Capability['Color setting'],
  mqtt: '/scene',
  parameters: { color_scene: { scenes }, instance: 'scene' },
});

describe('ColorSettingCapability', () => {
  const onChange = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  test('renders color type dropdown', () => {
    const props = {
      capability: makeColorModel(),
      index: 0,
      capabilities: [makeColorModel()],
      onCapabilityChange: onChange,
    };
    render(<ColorSettingCapability {...props} />);
    expect(screen.getByText('alice.labels.type')).toBeDefined();
  });

  test('renders color model dropdown for ColorModel type', () => {
    const props = {
      capability: makeColorModel(),
      index: 0,
      capabilities: [makeColorModel()],
      onCapabilityChange: onChange,
    };
    render(<ColorSettingCapability {...props} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    expect(screen.getByText('RGB')).toBeDefined();
  });

  test('renders temperature min/max for TemperatureK', () => {
    const cap = makeTemperature();
    render(
      <ColorSettingCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    expect(screen.getByText('alice.labels.min')).toBeDefined();
    expect(screen.getByText('alice.labels.max')).toBeDefined();
  });

  test('renders scenes input for ColorScene', () => {
    const cap = makeColorScene(['ocean', 'party']);
    render(
      <ColorSettingCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    expect(screen.getByText('alice.labels.scenes-input')).toBeDefined();
    const input = screen.getByDisplayValue('ocean, party');
    expect(input).toBeDefined();
  });

  test('type change to temperature resets parameters', () => {
    const props = {
      capability: makeColorModel(),
      index: 0,
      capabilities: [makeColorModel()],
      onCapabilityChange: onChange,
    };
    render(<ColorSettingCapability {...props} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: Color.TemperatureK } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.temperature_k).toEqual({ min: 2700, max: 6500 });
  });

  test('type change from temperature back to color model', () => {
    const cap = makeTemperature();
    render(
      <ColorSettingCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: Color.ColorModel } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.color_model).toBe(ColorModel.RGB);
  });

  test('temperature min change propagates', () => {
    const cap = makeTemperature(2700, 6500);
    render(
      <ColorSettingCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '3000' } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.temperature_k.min).toBe(3000);
  });

  test('scenes input parses comma-separated values', () => {
    const cap = makeColorScene([]);
    render(
      <ColorSettingCapability
        capability={cap}
        capabilities={[cap]}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ocean, sunset, party' } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.color_scene.scenes).toEqual(['ocean', 'sunset', 'party']);
  });

  test('disables already used color models', () => {
    const caps = [makeColorModel(), makeTemperature()];
    render(
      <ColorSettingCapability
        capability={caps[0]}
        capabilities={caps}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const selects = screen.getAllByRole('combobox');
    const tempOption = Array.from(selects[0].querySelectorAll('option'))
      .find((o) => o.value === Color.TemperatureK) as HTMLOptionElement;
    expect(tempOption?.disabled).toBe(true);
  });
});
