// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import { SelectControls } from './select-controls';

vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, children, heading, confirmCallback, closeCallback }: any) =>
    isOpened ? (
      <div data-testid="confirm-dialog">
        <div data-testid="heading">{heading}</div>
        {children}
        <button data-testid="confirm-btn" onClick={confirmCallback}>OK</button>
        <button data-testid="close-btn" onClick={closeCallback}>Close</button>
      </div>
    ) : null,
}));
vi.mock('@/components/input', () => ({
  Input: ({ placeholder, value, onChange }: any) => (
    <input
      data-testid={`input-${placeholder}`}
      placeholder={placeholder}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('@/components/tree', () => ({
  Tree: ({ data, selectedIds, onSelectionChange }: any) => (
    <div data-testid="tree">
      {data.map((item: any) => (
        <div key={item.id} data-testid={`tree-item-${item.id}`}>
          {item.label}
          {item.children?.map((child: any) => (
            <div key={child.id} data-testid={`tree-item-${child.id}`}>
              <button
                data-testid={`select-${child.id}`}
                onClick={() => {
                  const s = new Set(selectedIds);
                  s.add(child.id);
                  onSelectionChange(s);
                }}
              >
                {child.label}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

function makeDevicesStore(
  devices: { id: string; name: string; cells: string[] }[],
  cellData: Record<string, { name: string }>,
) {
  return {
    cells: new Map(Object.entries(cellData)),
    filteredDevices: new Map(
      devices.map((d) => [d.id, { id: d.id, name: d.name, cells: new Set(d.cells) }]),
    ),
  } as any;
}

const defaultDevicesStore = () =>
  makeDevicesStore(
    [
      { id: 'wb-adc', name: 'ADC', cells: ['wb-adc/Vin', 'wb-adc/A1'] },
      { id: 'wb-gpio', name: 'GPIO', cells: ['wb-gpio/EXT1'] },
    ],
    {
      'wb-adc/Vin': { name: 'Vin' },
      'wb-adc/A1': { name: 'A1' },
      'wb-gpio/EXT1': { name: 'EXT1' },
    },
  );

describe('SelectControls', () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  function renderSelect(props: Record<string, any> = {}) {
    return render(
      <SelectControls
        isOpen={true}
        configuredControls={[]}
        devicesStore={defaultDevicesStore()}
        onConfirm={onConfirm}
        onClose={onClose}
        {...props}
      />,
    );
  }

  beforeEach(() => vi.clearAllMocks());

  test('renders dialog when open', () => {
    renderSelect();
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    renderSelect({ isOpen: false });
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  test('renders heading', () => {
    renderSelect();
    expect(screen.getByTestId('heading')).toHaveTextContent(
      'mbgate.labels.select-channels',
    );
  });

  test('renders device and control nodes', () => {
    renderSelect();
    expect(screen.getByTestId('tree-item-wb-adc')).toBeInTheDocument();
    expect(screen.getByTestId('tree-item-wb-gpio')).toBeInTheDocument();
    expect(screen.getByTestId('tree-item-wb-adc/Vin')).toBeInTheDocument();
    expect(screen.getByTestId('tree-item-wb-adc/A1')).toBeInTheDocument();
    expect(screen.getByTestId('tree-item-wb-gpio/EXT1')).toBeInTheDocument();
  });

  test('excludes configured controls', () => {
    renderSelect({ configuredControls: ['wb-adc/Vin'] });
    expect(screen.queryByTestId('tree-item-wb-adc/Vin')).not.toBeInTheDocument();
    expect(screen.getByTestId('tree-item-wb-adc/A1')).toBeInTheDocument();
  });

  test('excludes device when all its controls configured', () => {
    renderSelect({ configuredControls: ['wb-gpio/EXT1'] });
    expect(screen.queryByTestId('tree-item-wb-gpio')).not.toBeInTheDocument();
  });

  test('shows MQTT id for controls', () => {
    renderSelect();
    expect(screen.getByText('(wb-adc/Vin)')).toBeInTheDocument();
  });

  test('filters by device name', () => {
    renderSelect();
    fireEvent.change(screen.getByTestId('input-mbgate.labels.search-device'), {
      target: { value: 'ADC' },
    });
    expect(screen.getByTestId('tree-item-wb-adc')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-item-wb-gpio')).not.toBeInTheDocument();
  });

  test('filters by control name', () => {
    renderSelect();
    fireEvent.change(screen.getByTestId('input-mbgate.labels.search-control'), {
      target: { value: 'Vin' },
    });
    expect(screen.getByTestId('tree-item-wb-adc/Vin')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-item-wb-adc/A1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tree-item-wb-gpio')).not.toBeInTheDocument();
  });

  test('calls onClose', () => {
    renderSelect();
    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onConfirm with selected leaf ids', () => {
    renderSelect();
    fireEvent.click(screen.getByTestId('select-wb-adc/Vin'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(onConfirm).toHaveBeenCalledWith(['wb-adc/Vin']);
  });

  test('sorts devices alphabetically', () => {
    const ds = makeDevicesStore(
      [
        { id: 'z-dev', name: 'Zulu', cells: ['z-dev/c1'] },
        { id: 'a-dev', name: 'Alpha', cells: ['a-dev/c1'] },
      ],
      { 'z-dev/c1': { name: 'C1' }, 'a-dev/c1': { name: 'C1' } },
    );
    renderSelect({ devicesStore: ds });
    const items = screen.getAllByTestId(/^tree-item-(a|z)-dev$/);
    expect(items[0]).toHaveAttribute('data-testid', 'tree-item-a-dev');
    expect(items[1]).toHaveAttribute('data-testid', 'tree-item-z-dev');
  });
});
