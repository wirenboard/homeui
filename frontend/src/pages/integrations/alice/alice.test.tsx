// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { authStoreMock } from '@/test/mocks/auth-store';
import AlicePage from './alice';

const { aliceMock, uiMock } = vi.hoisted(() => ({
  aliceMock: {
    roomList: [] as any[],
    rooms: new Map(),
    devices: new Map(),
    isAvailable: true as boolean | null,
    isIntegrationEnabled: false,
    checkIsAvailable: vi.fn(),
    fetchData: vi.fn(async () => ({})),
    fetchLinkStatus: vi.fn(async () => ({ linked: false, status_url: '' })),
    fetchIntegrationStatus: vi.fn(async () => {}),
    createLink: vi.fn(async () => ({ link_url: 'https://link' })),
    setIntegrationEnabled: vi.fn(async () => {}),
    unlinkController: vi.fn(async () => ({})),
  },
  uiMock: { modules: ['alice'] },
}));

vi.mock('@/stores/alice', () => ({
  aliceStore: aliceMock, DefaultRoom: 'without_rooms',
}));
vi.mock('@/stores/ui', () => ({ uiStore: uiMock }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title, actions, errors }: any) => (
    <div>
      <h1>{title}</h1>
      {errors?.map((e: any, i: number) => (
        <div key={i} data-testid="page-error">{e.text}</div>
      ))}
      <div data-testid="actions">{actions}</div>
      {children}
    </div>
  ),
}));
vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, heading, confirmCallback, closeCallback }: any) =>
    isOpened ? (
      <div data-testid="confirm-dialog">
        <span>{heading}</span>
        <button onClick={confirmCallback}>confirm</button>
        <button onClick={closeCallback}>cancel</button>
      </div>
    ) : null,
}));
vi.mock('@/components/tabs', () => ({
  Tabs: ({ items }: any) => (
    <div data-testid="tabs">
      {items?.map((i: any) => <span key={i.id}>{i.label}</span>)}
    </div>
  ),
  TabContent: ({ children }: any) => <div>{children}</div>,
  useTabs: () => ({ activeTab: 'all', setActiveTab: vi.fn(), onTabChange: vi.fn() }),
}));
vi.mock('@/components/switch', () => ({
  Switch: ({ value, onChange, ariaLabel, isDisabled }: any) => (
    <input
      type="checkbox"
      checked={value}
      aria-label={ariaLabel}
      disabled={isDisabled}
      onChange={(e: any) => onChange(e.target.checked)}
    />
  ),
}));
vi.mock('./components/room', () => ({
  Room: () => <div data-testid="room-component" />,
}));
vi.mock('./components/smart-device', () => ({
  SmartDevice: () => <div data-testid="smart-device-component" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  authStoreMock.hasRights.mockReturnValue(true);
  aliceMock.isAvailable = true;
  aliceMock.isIntegrationEnabled = false;
  aliceMock.roomList = [];
  aliceMock.fetchData.mockResolvedValue({});
  aliceMock.fetchIntegrationStatus.mockResolvedValue(undefined);
  aliceMock.fetchLinkStatus.mockResolvedValue({ linked: false, status_url: '' });
  aliceMock.createLink.mockResolvedValue({ link_url: 'https://link' });
  uiMock.modules = ['alice'];
});

describe('AlicePage', () => {
  test('renders page title', async () => {
    render(<AlicePage />);
    expect(screen.getByText('alice.title')).toBeDefined();
    await waitFor(() => expect(aliceMock.fetchData).toHaveBeenCalled());
  });

  test('calls init methods on mount', async () => {
    render(<AlicePage />);
    await waitFor(() => {
      expect(aliceMock.fetchData).toHaveBeenCalled();
      expect(aliceMock.fetchIntegrationStatus).toHaveBeenCalled();
      expect(aliceMock.checkIsAvailable).toHaveBeenCalled();
    });
  });

  test('skips init when not admin', async () => {
    authStoreMock.hasRights.mockReturnValue(false);
    render(<AlicePage />);
    expect(aliceMock.fetchData).not.toHaveBeenCalled();
  });

  test('shows onboarding when fetchData fails', async () => {
    aliceMock.fetchData.mockRejectedValue(new Error('fail'));
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByText('alice.labels.onboarding1')).toBeDefined();
      expect(screen.getByText('alice.labels.onboarding2')).toBeDefined();
    });
  });

  test('shows room and add buttons when connected', async () => {
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByTestId('room-component')).toBeDefined();
      expect(screen.getByText('alice.buttons.add-device')).toBeDefined();
      expect(screen.getByText('alice.buttons.add-room')).toBeDefined();
    });
  });

  test('shows error when module not installed', async () => {
    uiMock.modules = [];
    render(<AlicePage />);
    expect(screen.queryByTestId('room-component')).toBeNull();
  });

  test('shows error when not available', async () => {
    aliceMock.isAvailable = false;
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByText('alice.labels.unavailable')).toBeDefined();
    });
  });

  test('shows bind link when integration enabled and not linked', async () => {
    aliceMock.isIntegrationEnabled = true;
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByText('alice.buttons.bind')).toBeDefined();
    });
  });

  test('shows linked status when linked', async () => {
    aliceMock.isIntegrationEnabled = true;
    aliceMock.fetchLinkStatus.mockResolvedValue({
      linked: true, status_url: 'https://status',
    });
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByText('alice.labels.is-binded')).toBeDefined();
      expect(screen.getByText('alice.buttons.check-binding-status')).toBeDefined();
    });
  });

  test('shows integration toggle when available', async () => {
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByLabelText('alice.labels.enable-integration')).toBeDefined();
    });
  });

  test('toggles integration on', async () => {
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByLabelText('alice.labels.enable-integration')).toBeDefined();
    });
    fireEvent.click(screen.getByLabelText('alice.labels.enable-integration'));
    await waitFor(() => {
      expect(aliceMock.setIntegrationEnabled).toHaveBeenCalledWith(true);
    });
  });

  test('shows unlink button when linked', async () => {
    aliceMock.isIntegrationEnabled = true;
    aliceMock.fetchLinkStatus.mockResolvedValue({
      linked: true, status_url: 'https://status',
    });
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByText('alice.binding.unlink-controller')).toBeDefined();
    });
  });

  test('opens confirm dialog on unlink click', async () => {
    aliceMock.isIntegrationEnabled = true;
    aliceMock.fetchLinkStatus.mockResolvedValue({
      linked: true, status_url: 'https://status',
    });
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByText('alice.binding.unlink-controller')).toBeDefined();
    });
    fireEvent.click(screen.getByText('alice.binding.unlink-controller'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
    });
  });

  test('calls unlinkController on confirm', async () => {
    aliceMock.isIntegrationEnabled = true;
    aliceMock.fetchLinkStatus.mockResolvedValue({
      linked: true, status_url: 'https://status',
    });
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByText('alice.binding.unlink-controller')).toBeDefined();
    });
    fireEvent.click(screen.getByText('alice.binding.unlink-controller'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
    });
    fireEvent.click(screen.getByText('confirm'));
    await waitFor(() => {
      expect(aliceMock.unlinkController).toHaveBeenCalled();
    });
  });

  test('shows integration error on status fetch failure', async () => {
    aliceMock.fetchIntegrationStatus.mockRejectedValue({
      response: { data: { detail: 'Server error' } },
    });
    render(<AlicePage />);
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeDefined();
    });
  });
});
