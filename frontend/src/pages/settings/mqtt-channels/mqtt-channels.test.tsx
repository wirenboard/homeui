// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import MqttChannelsPage from './mqtt-channels';

const { devicesStoreMock } = vi.hoisted(() => ({
  devicesStoreMock: {
    filteredCells: [] as any[],
  },
}));

vi.mock('@/stores/devices', () => ({
  devicesStore: devicesStoreMock,
}));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title }: any) => (
    <div data-testid="page-layout"><h1>{title}</h1>{children}</div>
  ),
}));
vi.mock('@/components/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="search-input"
      value={value}
      placeholder={placeholder}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('@/components/table', () => ({
  Table: ({ children }: any) => <table><tbody>{children}</tbody></table>,
  TableRow: ({ children, isHeading }: any) =>
    isHeading ? <tr data-testid="heading-row">{children}</tr> : <tr>{children}</tr>,
  TableCell: ({ children, sort }: any) => (
    <td>
      {sort && <button data-testid={`sort-${sort.label}`} onClick={sort.onSort}>{sort.label}</button>}
      {children}
    </td>
  ),
}));
vi.mock('@/common/links', () => ({
  documentation: { en: { mqtt: '#mqtt' } },
}));
vi.mock('./components/cell-row', () => ({
  CellRow: ({ cell }: any) => <tr data-testid={`cell-${cell.id}`}><td>{cell.id}</td></tr>,
}));

function makeCell(overrides: Record<string, any> = {}) {
  return {
    id: 'wb-adc/Vin',
    deviceId: 'wb-adc',
    controlId: 'Vin',
    type: 'voltage',
    value: 12.5,
    error: null,
    ...overrides,
  };
}

describe('MqttChannelsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    devicesStoreMock.filteredCells = [];
  });

  test('renders page title', () => {
    render(<MqttChannelsPage />);
    expect(screen.getByRole('heading')).toHaveTextContent('mqtt.title');
  });

  test('renders search input', () => {
    render(<MqttChannelsPage />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  test('renders table heading row', () => {
    render(<MqttChannelsPage />);
    expect(screen.getByTestId('heading-row')).toBeInTheDocument();
  });

  test('renders cell rows from store', () => {
    devicesStoreMock.filteredCells = [
      makeCell({ id: 'dev1/ctrl1', deviceId: 'dev1', controlId: 'ctrl1' }),
      makeCell({ id: 'dev2/ctrl2', deviceId: 'dev2', controlId: 'ctrl2' }),
    ];
    render(<MqttChannelsPage />);
    expect(screen.getByTestId('cell-dev1/ctrl1')).toBeInTheDocument();
    expect(screen.getByTestId('cell-dev2/ctrl2')).toBeInTheDocument();
  });

  test('renders no cell rows when store is empty', () => {
    render(<MqttChannelsPage />);
    expect(screen.queryByTestId(/^cell-/)).not.toBeInTheDocument();
  });

  describe('filtering', () => {
    beforeEach(() => {
      devicesStoreMock.filteredCells = [
        makeCell({ id: 'wb-adc/Vin', type: 'voltage', value: 12.5 }),
        makeCell({ id: 'wb-gpio/A1', deviceId: 'wb-gpio', controlId: 'A1', type: 'switch', value: 0 }),
        makeCell(
          { id: 'wb-msw/Temperature', deviceId: 'wb-msw', controlId: 'Temperature', type: 'temperature', value: 23.5 },
        ),
      ];
    });

    test('filters by id', () => {
      render(<MqttChannelsPage />);
      fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'gpio' } });
      expect(screen.getByTestId('cell-wb-gpio/A1')).toBeInTheDocument();
      expect(screen.queryByTestId('cell-wb-adc/Vin')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cell-wb-msw/Temperature')).not.toBeInTheDocument();
    });

    test('filters by type', () => {
      render(<MqttChannelsPage />);
      fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'voltage' } });
      expect(screen.getByTestId('cell-wb-adc/Vin')).toBeInTheDocument();
      expect(screen.queryByTestId('cell-wb-gpio/A1')).not.toBeInTheDocument();
    });

    test('filters by value', () => {
      render(<MqttChannelsPage />);
      fireEvent.change(screen.getByTestId('search-input'), { target: { value: '23.5' } });
      expect(screen.getByTestId('cell-wb-msw/Temperature')).toBeInTheDocument();
      expect(screen.queryByTestId('cell-wb-adc/Vin')).not.toBeInTheDocument();
    });

    test('shows all cells when search is empty', () => {
      render(<MqttChannelsPage />);
      fireEvent.change(screen.getByTestId('search-input'), { target: { value: '' } });
      expect(screen.getByTestId('cell-wb-adc/Vin')).toBeInTheDocument();
      expect(screen.getByTestId('cell-wb-gpio/A1')).toBeInTheDocument();
      expect(screen.getByTestId('cell-wb-msw/Temperature')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      devicesStoreMock.filteredCells = [
        makeCell({ id: 'b-dev/ctrl', deviceId: 'b-dev', controlId: 'ctrl', type: 'switch', value: 1 }),
        makeCell({ id: 'a-dev/ctrl', deviceId: 'a-dev', controlId: 'ctrl', type: 'voltage', value: 5 }),
        makeCell({ id: 'c-dev/ctrl', deviceId: 'c-dev', controlId: 'ctrl', type: 'range', value: 3 }),
      ];
    });

    test('sorts by id ascending by default', () => {
      render(<MqttChannelsPage />);
      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'cell-a-dev/ctrl');
      expect(rows[1]).toHaveAttribute('data-testid', 'cell-b-dev/ctrl');
      expect(rows[2]).toHaveAttribute('data-testid', 'cell-c-dev/ctrl');
    });

    test('toggles sort direction on same column click', () => {
      render(<MqttChannelsPage />);
      const idSortLabel = 'mqtt.labels.device mqtt.labels.control';
      fireEvent.click(screen.getByTestId(`sort-${idSortLabel}`));

      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'cell-c-dev/ctrl');
      expect(rows[2]).toHaveAttribute('data-testid', 'cell-a-dev/ctrl');
    });

    test('sorts by type column', () => {
      render(<MqttChannelsPage />);
      fireEvent.click(screen.getByTestId('sort-mqtt.labels.type'));

      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'cell-c-dev/ctrl');
      expect(rows[1]).toHaveAttribute('data-testid', 'cell-b-dev/ctrl');
      expect(rows[2]).toHaveAttribute('data-testid', 'cell-a-dev/ctrl');
    });

    test('sorts by value column numerically', () => {
      render(<MqttChannelsPage />);
      fireEvent.click(screen.getByTestId('sort-mqtt.labels.value'));

      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'cell-b-dev/ctrl');
      expect(rows[1]).toHaveAttribute('data-testid', 'cell-c-dev/ctrl');
      expect(rows[2]).toHaveAttribute('data-testid', 'cell-a-dev/ctrl');
    });

    test('sorts by status column', () => {
      devicesStoreMock.filteredCells = [
        makeCell({ id: 'ok-cell/a', deviceId: 'ok-cell', controlId: 'a', error: null }),
        makeCell({ id: 'err-cell/b', deviceId: 'err-cell', controlId: 'b', error: ['r'] }),
      ];
      render(<MqttChannelsPage />);
      fireEvent.click(screen.getByTestId('sort-mqtt.labels.status'));

      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'cell-err-cell/b');
      expect(rows[1]).toHaveAttribute('data-testid', 'cell-ok-cell/a');
    });

    test('sorts by topic column', () => {
      render(<MqttChannelsPage />);
      fireEvent.click(screen.getByTestId('sort-mqtt.labels.topic'));

      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'cell-a-dev/ctrl');
      expect(rows[2]).toHaveAttribute('data-testid', 'cell-c-dev/ctrl');
    });

    test('resets direction to asc when switching columns', () => {
      render(<MqttChannelsPage />);
      const idSortLabel = 'mqtt.labels.device mqtt.labels.control';
      fireEvent.click(screen.getByTestId(`sort-${idSortLabel}`));

      fireEvent.click(screen.getByTestId('sort-mqtt.labels.type'));

      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'cell-c-dev/ctrl');
    });

    test('uses id as secondary sort for equal primary values', () => {
      devicesStoreMock.filteredCells = [
        makeCell({ id: 'z-dev/ctrl', deviceId: 'z-dev', controlId: 'ctrl', type: 'switch', value: 1 }),
        makeCell({ id: 'a-dev/ctrl', deviceId: 'a-dev', controlId: 'ctrl', type: 'switch', value: 1 }),
      ];
      render(<MqttChannelsPage />);
      fireEvent.click(screen.getByTestId('sort-mqtt.labels.type'));

      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'cell-a-dev/ctrl');
      expect(rows[1]).toHaveAttribute('data-testid', 'cell-z-dev/ctrl');
    });

    test('handles string value comparison', () => {
      devicesStoreMock.filteredCells = [
        makeCell({ id: 'b/ctrl', deviceId: 'b', controlId: 'ctrl', value: 'banana' }),
        makeCell({ id: 'a/ctrl', deviceId: 'a', controlId: 'ctrl', value: 'apple' }),
      ];
      render(<MqttChannelsPage />);
      fireEvent.click(screen.getByTestId('sort-mqtt.labels.value'));

      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'cell-a/ctrl');
      expect(rows[1]).toHaveAttribute('data-testid', 'cell-b/ctrl');
    });

    test('handles null value in comparison', () => {
      devicesStoreMock.filteredCells = [
        makeCell({ id: 'b/ctrl', deviceId: 'b', controlId: 'ctrl', value: null }),
        makeCell({ id: 'a/ctrl', deviceId: 'a', controlId: 'ctrl', value: 5 }),
      ];
      render(<MqttChannelsPage />);
      fireEvent.click(screen.getByTestId('sort-mqtt.labels.value'));
      const rows = screen.getAllByTestId(/^cell-/);
      expect(rows).toHaveLength(2);
    });
  });
});
