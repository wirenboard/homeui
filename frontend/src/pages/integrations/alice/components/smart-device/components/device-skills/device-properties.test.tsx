// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Property, floats, events } from '@/stores/alice';
import { DeviceProperties } from './device-properties';

vi.mock('@/stores/alice', async () => {
  const c = await vi.importActual<any>('@/stores/alice/constants');
  return {
    ...c,
    aliceStore: {},
    getPropertyDefaults: () => ({ retrievable: true, reportable: true }),
    isFieldModified: () => false,
    countModifiedProperty: () => 0,
  };
});
vi.mock('./property-options-button', () => ({
  PropertyOptionsButton: () => <div data-testid="property-options" />,
}));
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

const makeFloat = (instance = 'temperature', unit = 'unit.temperature.celsius') => ({
  type: Property.Float,
  mqtt: '/wb/temp',
  parameters: { instance, unit },
});

const makeEvent = (instance = 'vibration', value = 'value.tilt') => ({
  type: Property.Event,
  mqtt: '/wb/event',
  parameters: { instance, value },
});

describe('DeviceProperties', () => {
  const onChange = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  test('renders title and description', () => {
    render(<DeviceProperties properties={[]} onPropertyChange={onChange} />);
    expect(screen.getByText('alice.labels.device-properties')).toBeDefined();
    expect(screen.getByText('alice.labels.device-properties-description')).toBeDefined();
  });

  test('renders add button', () => {
    render(<DeviceProperties properties={[]} onPropertyChange={onChange} />);
    expect(screen.getByText('alice.buttons.add-property')).toBeDefined();
  });

  test('add button adds float property with defaults', () => {
    render(<DeviceProperties properties={[]} onPropertyChange={onChange} />);
    fireEvent.click(screen.getByText('alice.buttons.add-property'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        type: Property.Float,
        mqtt: '',
        parameters: expect.objectContaining({ instance: floats[0] }),
      }),
    ]);
  });

  test('renders float property with instance and unit dropdowns', () => {
    const props = [makeFloat()];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(3);
  });

  test('renders event property with instance and value dropdowns', () => {
    const props = [makeEvent()];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    expect(screen.getByText('alice.labels.event-value')).toBeDefined();
  });

  test('float instance change updates unit', () => {
    const props = [makeFloat('temperature', 'unit.temperature.celsius')];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    const instanceSelect = selects[2];
    fireEvent.change(instanceSelect, { target: { value: 'humidity' } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.instance).toBe('humidity');
    expect(updated.parameters.unit).toBe('unit.percent');
  });

  test('shows no-units for instances without units', () => {
    const props = [makeFloat('meter', undefined)];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    expect(screen.getByText('alice.labels.no-units')).toBeDefined();
  });

  test('delete removes property from list', () => {
    const props = [makeFloat(), makeEvent()];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    const deleteButtons = screen.getAllByRole('button')
      .filter((b) => !b.textContent);
    fireEvent.click(deleteButtons[0]);
    expect(onChange).toHaveBeenCalledWith([props[1]]);
  });

  test('type change from float to event regenerates parameters', () => {
    const props = [makeFloat()];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    const typeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(typeSelect, { target: { value: Property.Event } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.type).toBe(Property.Event);
    expect(updated.parameters.instance).toBeDefined();
  });

  test('event instance change updates value', () => {
    const props = [makeEvent('vibration', 'value.tilt')];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    const instanceSelect = selects[2];
    fireEvent.change(instanceSelect, { target: { value: 'open' } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.instance).toBe('open');
    expect(updated.parameters.value).toBeDefined();
  });

  test('topic change updates mqtt', () => {
    const props = [makeFloat()];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: '/wb/temp' } });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ mqtt: '/wb/temp' }),
    ]);
  });

  test('float unit change propagates', () => {
    const props = [makeFloat('pressure', 'unit.pressure.atm')];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    const unitSelect = selects[3];
    fireEvent.change(unitSelect, { target: { value: 'unit.pressure.bar' } });
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.parameters.unit).toBe('unit.pressure.bar');
  });

  test('disables used float instances', () => {
    const props = [makeFloat('temperature'), makeFloat('humidity')];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    const firstInstanceSelect = selects[2];
    const humidityOpt = Array.from(firstInstanceSelect.querySelectorAll('option'))
      .find((o) => o.value === 'humidity') as HTMLOptionElement;
    expect(humidityOpt?.disabled).toBe(true);
  });

  test('add button disabled when all float instances used', () => {
    const allFloats = floats.map((f) => makeFloat(f));
    const allEvents = events.map((e) => {
      const vals = ['value.tilt', 'value.fall', 'value.vibration'];
      return vals.map((v) => makeEvent(e, v));
    }).flat();
    const allProps = [...allFloats, ...allEvents];
    render(<DeviceProperties properties={allProps} onPropertyChange={onChange} />);
    const addBtn = screen.getByText('alice.buttons.add-property');
    expect((addBtn as HTMLButtonElement).disabled).toBe(true);
  });

  test('renders multiple properties', () => {
    const props = [makeFloat(), makeEvent()];
    render(<DeviceProperties properties={props} onPropertyChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(5);
  });
});
