// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Capability, ranges } from '@/stores/alice';
import { RANGE_LIMITS_LOCKED } from './helpers';
import { RangeCapability } from './range';

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
vi.mock('@/components/input', () => ({
  Input: ({ value, onChangeEvent, id, isDisabled }: any) => (
    <input
      aria-label={id}
      data-testid={id || 'input'}
      disabled={isDisabled}
      value={String(value ?? '')}
      onChange={(e: any) => {
        if (onChangeEvent) {
          const num = parseFloat(e.target.value) || 0;
          onChangeEvent({ currentTarget: { valueAsNumber: num } });
        }
      }}
    />
  ),
}));

const makeRange = (instance: string, min = 0, max = 100, precision = 1) => ({
  type: Capability.Range,
  mqtt: '/topic',
  parameters: { instance, range: { min, max, precision }, unit: 'unit.percent' },
});

describe('RangeCapability', () => {
  const onChange = vi.fn();
  const baseProps = {
    capability: makeRange('brightness'),
    index: 0,
    capabilities: [makeRange('brightness')],
    onCapabilityChange: onChange,
  };

  beforeEach(() => vi.clearAllMocks());

  test('renders instance dropdown with all range instances', () => {
    render(<RangeCapability {...baseProps} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(ranges.length);
  });

  test('renders min/max/precision inputs', () => {
    render(<RangeCapability {...baseProps} />);
    expect(screen.getByText('alice.labels.min')).toBeDefined();
    expect(screen.getByText('alice.labels.max')).toBeDefined();
    expect(screen.getByText('alice.labels.precision')).toBeDefined();
  });

  test('disables min/max for locked instances', () => {
    render(<RangeCapability {...baseProps} />);
    const inputs = screen.getAllByRole('textbox');
    const minInput = inputs[0] as HTMLInputElement;
    const maxInput = inputs[1] as HTMLInputElement;
    expect(minInput.disabled).toBe(true);
    expect(maxInput.disabled).toBe(true);
  });

  test('enables min/max for unlocked instances', () => {
    const props = {
      ...baseProps,
      capability: makeRange('temperature', 0, 50, 1),
      capabilities: [makeRange('temperature', 0, 50, 1)],
    };
    render(<RangeCapability {...props} />);
    const inputs = screen.getAllByRole('textbox');
    expect((inputs[0] as HTMLInputElement).disabled).toBe(false);
    expect((inputs[1] as HTMLInputElement).disabled).toBe(false);
  });

  test('precision is always editable', () => {
    render(<RangeCapability {...baseProps} />);
    const inputs = screen.getAllByRole('textbox');
    const precisionInput = inputs[2] as HTMLInputElement;
    expect(precisionInput.disabled).toBeFalsy();
  });

  test('instance change calls onCapabilityChange with updated params', () => {
    render(<RangeCapability {...baseProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'volume' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          parameters: expect.objectContaining({ instance: 'volume' }),
        }),
      ]),
    );
  });

  test('instance change applies locked range limits', () => {
    render(<RangeCapability {...baseProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'humidity' } });
    const call = onChange.mock.calls[0][0][0];
    expect(call.parameters.range.min).toBe(RANGE_LIMITS_LOCKED.humidity.min);
    expect(call.parameters.range.max).toBe(RANGE_LIMITS_LOCKED.humidity.max);
  });

  test('precision change propagates', () => {
    render(<RangeCapability {...baseProps} />);
    const inputs = screen.getAllByRole('textbox');
    const enabledInputs = inputs.filter((i: any) => !(i as HTMLInputElement).disabled);
    fireEvent.change(enabledInputs[0], { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          parameters: expect.objectContaining({
            range: expect.objectContaining({ precision: 5 }),
          }),
        }),
      ]),
    );
  });

  test('disables already used instances', () => {
    const caps = [makeRange('brightness'), makeRange('humidity')];
    render(
      <RangeCapability
        capability={caps[0]}
        capabilities={caps}
        index={0}
        onCapabilityChange={onChange}
      />,
    );
    const opt = screen.getByRole('option', { name: 'humidity' }) as HTMLOptionElement;
    expect(opt.disabled).toBe(true);
  });
});
