// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { dashboardsStore } from '@/stores/dashboards';
import { authStoreMock } from '@/test/mocks/auth-store';
import { downloadFile } from '@/utils/donwload-file';
import HistoryPage from './history';

const { navigateMock, routerState } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  routerState: {
    params: {} as Record<string, string | undefined>,
    locationState: null as any,
    searchParams: new URLSearchParams(),
  },
}));

const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    controls: [
      {
        name: 'Temp', group: 'history.labels.widget_channels',
        deviceId: 'wb', controlId: 'temp', widget: { id: 'w1' },
      },
      {
        name: 'Humidity', group: 'history.labels.all_channels',
        deviceId: 'wb', controlId: 'hum', widget: { id: '' },
      },
    ],
    selectedControls: ['wb/temp/w1'] as (string | null)[],
    charts: [] as any[],
    chartConfig: [] as any[],
    layoutConfig: {},
    dataPointsMultiple: [] as any[],
    chunksN: 0,
    loadPending: false,
    disableUi: false,
    stopLoadData: false,
    selectedStartDate: new Date('2025-01-01'),
    selectedEndDate: new Date('2025-01-02'),
    errors: [] as any[],
    initialize: vi.fn(),
    setChartContainerRef: vi.fn(),
    loadData: vi.fn(() => 'encoded-id'),
    setSelectedControlValue: vi.fn(),
    removeControlAt: vi.fn(),
    addControlSlot: vi.fn(),
    setSelectedStartDateFromInput: vi.fn(),
    setSelectedEndDateFromInput: vi.fn(),
    resetDates: vi.fn(),
    stopLoadingData: vi.fn(),
    prepareLoad: vi.fn(),
    onRelayout: vi.fn(),
  },
}));

vi.mock('@/utils/use-store', () => ({ useStore: () => storeMock }));
vi.mock('@/stores/dashboards', () => import('@/test/mocks/dashboards-store'));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title, actions, errors, isLoading }: any) => (
    <div>
      <h1>{title}</h1>
      {isLoading && <div data-testid="page-loading" />}
      <div data-testid="actions">{actions}</div>
      {errors?.map((e: any, i: number) => (
        <div key={i} data-testid="page-error">{e.text}</div>
      ))}
      {children}
    </div>
  ),
}));
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ options, onChange, placeholder }: any) => (
    <div data-testid="add-dropdown">
      <span>{placeholder}</span>
      {options?.map((group: any) =>
        group.options
          ? group.options.map((opt: any) => (
            <button key={opt.value} disabled={opt.isDisabled} onClick={() => onChange(opt)}>{opt.label}</button>
          ))
          : <button key={group.value} onClick={() => onChange(group)}>{group.label}</button>,
      )}
    </div>
  ),
}));
vi.mock('@/components/tooltip', () => ({ Tooltip: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/utils/donwload-file', () => ({ downloadFile: vi.fn() }));
vi.mock('@/components/chart', () => ({
  Chart: () => <div data-testid="chart" />,
}));
vi.mock('@/components/datetime-picker', () => ({
  DateTimePicker: ({ id, value, onChange }: any) => (
    <input data-testid={id} value={value?.toISOString?.()} onChange={(e) => onChange(new Date(e.target.value))} />
  ),
}));
vi.mock('@/components/progress', () => ({
  Progress: ({ caption }: any) => <div data-testid="progress">{caption}</div>,
}));
vi.mock('@/components/table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as any),
    useNavigate: () => navigateMock,
    useParams: () => routerState.params,
    useLocation: () => ({ state: routerState.locationState }),
    useSearchParams: () => [routerState.searchParams],
  };
});

function resetStore() {
  storeMock.controls = [
    {
      name: 'Temp', group: 'history.labels.widget_channels',
      deviceId: 'wb', controlId: 'temp', widget: { id: 'w1' },
    },
    {
      name: 'Humidity', group: 'history.labels.all_channels',
      deviceId: 'wb', controlId: 'hum', widget: { id: '' },
    },
  ];
  storeMock.selectedControls = ['wb/temp/w1'];
  storeMock.charts = [];
  storeMock.chartConfig = [];
  storeMock.dataPointsMultiple = [];
  storeMock.chunksN = 0;
  storeMock.loadPending = false;
  storeMock.disableUi = false;
  storeMock.errors = [];
}

beforeEach(() => {
  vi.clearAllMocks();
  authStoreMock.hasRights.mockReturnValue(true);
  (dashboardsStore as any).isLoading = false;
  routerState.params = {};
  routerState.locationState = null;
  routerState.searchParams = new URLSearchParams();
  resetStore();
});

describe('HistoryPage', () => {
  describe('rendering', () => {
    test('renders page title and form elements', () => {
      render(<HistoryPage />);
      expect(screen.getByText('history.title')).toBeDefined();
      expect(screen.getByText('history.labels.choose')).toBeDefined();
      expect(screen.getByText('history.labels.start')).toBeDefined();
      expect(screen.getByText('history.labels.end')).toBeDefined();
      expect(screen.getByTestId('history-start')).toBeDefined();
      expect(screen.getByTestId('history-end')).toBeDefined();
      expect(screen.getByText('history.buttons.load')).toBeDefined();
      expect(screen.getByText('history.buttons.today')).toBeDefined();
    });

    test('shows nothing message when no chart data and not loading', () => {
      render(<HistoryPage />);
      expect(screen.getByText('history.labels.nothing')).toBeDefined();
    });
  });

  describe('channel controls', () => {
    test('renders grouped channel options in dropdown', () => {
      render(<HistoryPage />);
      expect(screen.getByText('Temp')).toBeDefined();
      expect(screen.getByText('Humidity')).toBeDefined();
    });

    test('clicking channel option calls setSelectedControlValue', () => {
      render(<HistoryPage />);
      fireEvent.click(screen.getByText('Humidity'));
      expect(storeMock.setSelectedControlValue).toHaveBeenCalledWith(0, 'wb/hum');
    });

    test('shows add channel button when first control is selected', () => {
      render(<HistoryPage />);
      expect(screen.getByText('history.buttons.add')).toBeDefined();
    });

    test('hides add channel button when single empty slot', () => {
      storeMock.selectedControls = [null];
      render(<HistoryPage />);
      expect(screen.queryByText('history.buttons.add')).toBeNull();
    });

    test('clicking add channel calls addControlSlot', () => {
      render(<HistoryPage />);
      fireEvent.click(screen.getByText('history.buttons.add'));
      expect(storeMock.addControlSlot).toHaveBeenCalled();
    });

    test('shows delete button for second channel', () => {
      storeMock.selectedControls = ['wb/temp/w1', 'wb/hum'];
      render(<HistoryPage />);
      const deleteButtons = screen.getAllByText('history.buttons.delete');
      expect(deleteButtons).toHaveLength(2);
    });

    test('hides delete button when only one channel', () => {
      render(<HistoryPage />);
      expect(screen.queryByText('history.buttons.delete')).toBeNull();
    });

    test('clicking delete calls removeControlAt', () => {
      storeMock.selectedControls = ['wb/temp/w1', 'wb/hum'];
      render(<HistoryPage />);
      const deleteButtons = screen.getAllByText('history.buttons.delete');
      fireEvent.click(deleteButtons[1]);
      expect(storeMock.removeControlAt).toHaveBeenCalledWith(1);
    });
  });

  describe('date controls', () => {
    test('clicking today calls resetDates', () => {
      render(<HistoryPage />);
      fireEvent.click(screen.getByText('history.buttons.today'));
      expect(storeMock.resetDates).toHaveBeenCalled();
    });
  });

  describe('loading', () => {
    test('load button disabled when no control or UI disabled', () => {
      storeMock.selectedControls = [null];
      render(<HistoryPage />);
      expect(screen.getByText('history.buttons.load').closest('button')?.disabled).toBe(true);
    });

    test('clicking load calls prepareLoad', () => {
      render(<HistoryPage />);
      fireEvent.click(screen.getByText('history.buttons.load'));
      expect(storeMock.prepareLoad).toHaveBeenCalled();
    });

    test('form submit calls loadData and navigates', () => {
      render(<HistoryPage />);
      fireEvent.submit(screen.getByText('history.buttons.load').closest('form')!);
      expect(storeMock.loadData).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/history/encoded-id');
    });

    test('shows stop button when loading', () => {
      storeMock.loadPending = true;
      render(<HistoryPage />);
      expect(screen.getByText('history.buttons.stop')).toBeDefined();
      expect(screen.queryByText('history.buttons.load')).toBeNull();
    });

    test('clicking stop calls stopLoadingData', () => {
      storeMock.loadPending = true;
      render(<HistoryPage />);
      fireEvent.click(screen.getByText('history.buttons.stop'));
      expect(storeMock.stopLoadingData).toHaveBeenCalled();
    });

    test('shows progress when loading with multiple chunks', () => {
      storeMock.loadPending = true;
      storeMock.chunksN = 5;
      storeMock.charts = [{ progress: { value: 3 }, channelName: 'Temp' }];
      storeMock.selectedControls = ['wb/temp/w1'];
      render(<HistoryPage />);
      expect(screen.getByTestId('progress')).toBeDefined();
      expect(screen.getByText('3/5')).toBeDefined();
    });
  });

  describe('chart and table display', () => {
    test('renders chart when data loaded and hides nothing message', () => {
      storeMock.chartConfig = [{ x: [], y: [] }];
      render(<HistoryPage />);
      expect(screen.getByTestId('chart')).toBeDefined();
      expect(screen.queryByText('history.labels.nothing')).toBeNull();
    });

    test('hides chart during loading', () => {
      storeMock.chartConfig = [{ x: [], y: [] }];
      storeMock.loadPending = true;
      render(<HistoryPage />);
      expect(screen.queryByTestId('chart')).toBeNull();
    });

    test('renders data table with headers and values', () => {
      storeMock.dataPointsMultiple = [
        { date: '2025-01-01T12:00:00Z', value: ['22.5'], showMs: false },
      ];
      storeMock.charts = [{ channelName: 'Temperature' }];
      render(<HistoryPage />);
      expect(screen.getByText('history.labels.date')).toBeDefined();
      expect(screen.getByText('Temperature')).toBeDefined();
      expect(screen.getByText('22.5')).toBeDefined();
    });

    test('hides table when no data points', () => {
      storeMock.dataPointsMultiple = [];
      render(<HistoryPage />);
      expect(screen.queryByText('history.labels.date')).toBeNull();
    });
  });

  describe('action buttons', () => {
    test('shows download when chart data, hides when empty', () => {
      storeMock.chartConfig = [{ x: [], y: [] }];
      const { unmount } = render(<HistoryPage />);
      expect(screen.getByText('history.buttons.download')).toBeDefined();
      unmount();
      storeMock.chartConfig = [];
      render(<HistoryPage />);
      expect(screen.queryByText('history.buttons.download')).toBeNull();
    });

    test('download button disabled while loading', () => {
      storeMock.chartConfig = [{ x: [], y: [] }];
      storeMock.loadPending = true;
      render(<HistoryPage />);
      const btn = screen.getByText('history.buttons.download').closest('button');
      expect(btn?.disabled).toBe(true);
    });

    test('clicking download calls downloadFile with CSV', () => {
      storeMock.chartConfig = [{ x: [], y: [] }];
      storeMock.dataPointsMultiple = [
        { date: '2025-01-01T12:00:00Z', value: ['22.5'], showMs: false },
      ];
      storeMock.charts = [{ channelName: 'Ch' }];
      render(<HistoryPage />);
      fireEvent.click(screen.getByText('history.buttons.download'));
      expect(downloadFile).toHaveBeenCalledWith(
        'filename.csv', 'text/csv', expect.any(Array),
      );
    });

    test('back button shown with canReturn and navigates back', () => {
      render(<HistoryPage />);
      expect(screen.queryByText('common.buttons.back')).toBeNull();
      routerState.locationState = { canReturn: true };
      const { unmount } = render(<HistoryPage />);
      fireEvent.click(screen.getByText('common.buttons.back'));
      expect(navigateMock).toHaveBeenCalledWith(-1);
      unmount();
    });
  });

  describe('initialization', () => {
    test('calls initialize when dashboards not loading', () => {
      render(<HistoryPage />);
      expect(storeMock.initialize).toHaveBeenCalledWith(undefined);
    });

    test('calls initialize with route id', () => {
      routerState.params = { id: 'abc123' };
      render(<HistoryPage />);
      expect(storeMock.initialize).toHaveBeenCalledWith('abc123');
    });

    test('does not call initialize when dashboards loading', () => {
      (dashboardsStore as any).isLoading = true;
      render(<HistoryPage />);
      expect(storeMock.initialize).not.toHaveBeenCalled();
    });
  });

  describe('fullscreen navigation', () => {
    test('form submit preserves fullscreen param in URL', () => {
      routerState.searchParams = new URLSearchParams('fullscreen=true');
      render(<HistoryPage />);
      fireEvent.submit(
        screen.getByText('history.buttons.load').closest('form')!,
      );
      expect(navigateMock).toHaveBeenCalledWith(
        '/history/encoded-id?fullscreen=true',
      );
    });
  });

  describe('page loading state', () => {
    test('passes isLoading when no channel options', () => {
      storeMock.controls = [];
      render(<HistoryPage />);
      expect(screen.getByTestId('page-loading')).toBeDefined();
    });

    test('does not pass isLoading when channels available', () => {
      render(<HistoryPage />);
      expect(screen.queryByTestId('page-loading')).toBeNull();
    });
  });

  describe('errors', () => {
    test('passes errors to page layout', () => {
      storeMock.errors = [{ text: 'Load failed' }];
      render(<HistoryPage />);
      expect(screen.getByTestId('page-error')).toBeDefined();
      expect(screen.getByText('Load failed')).toBeDefined();
    });
  });
});
