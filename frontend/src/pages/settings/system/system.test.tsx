// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SystemPage from './system';

const { authMock, getDeviceInfoMock } = vi.hoisted(() => ({
  authMock: { hasRights: vi.fn(() => true) },
  getDeviceInfoMock: vi.fn(async () => ({
    release_suite: 'testing',
    release_name: 'wb7-testing',
    rootfs_expanded: false,
  })),
}));

vi.mock('@/stores/auth', () => ({
  authStore: authMock,
  UserRole: { Admin: 'admin' },
}));
vi.mock('@/utils/https-utils', () => ({ getDeviceInfo: getDeviceInfoMock }));
const fwStoreMock = { setIsRootfsAlreadyExpanded: vi.fn() };
vi.mock('@/utils/use-store', () => ({
  useStore: () => fwStoreMock,
}));
vi.mock('@/common/links', () => ({
  documentation: { en: { system: '#sys-docs' } },
}));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ title, children }: any) => (
    <div><h1>{title}</h1>{children}</div>
  ),
}));
vi.mock('@/components/alert', () => ({
  Alert: ({ children, onClose, variant }: any) => (
    <div data-testid={`alert-${variant}`}>
      {children}
      {onClose && <button data-testid={`close-${variant}`} onClick={onClose} />}
    </div>
  ),
}));
vi.mock('./components/cloud-status', () => ({
  CloudStatus: () => <div data-testid="cloud-status" />,
}));
vi.mock('./components/backup', () => ({
  Backup: () => <div data-testid="backup" />,
}));
vi.mock('./components/diagnostic', () => ({
  Diagnostic: () => <div data-testid="diagnostic" />,
}));
vi.mock('./components/firmware-update', () => ({
  FirmwareUpdate: ({ mode }: any) => <div data-testid={`firmware-${mode}`} />,
  FirmwareUpdateStore: class {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.hasRights.mockReturnValue(true);
  getDeviceInfoMock.mockResolvedValue({
    release_suite: 'testing',
    release_name: 'wb7-testing',
    rootfs_expanded: false,
  });
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
});

describe('SystemPage', () => {
  test('renders page title', () => {
    render(<SystemPage />);
    expect(screen.getByText('system.title')).toBeDefined();
  });

  test('renders all sections', () => {
    render(<SystemPage />);
    expect(screen.getByTestId('cloud-status')).toBeDefined();
    expect(screen.getByTestId('firmware-update')).toBeDefined();
    expect(screen.getByTestId('firmware-reset')).toBeDefined();
    expect(screen.getByTestId('backup')).toBeDefined();
    expect(screen.getByTestId('diagnostic')).toBeDefined();
  });

  test('shows stable offer when release_suite is stable', async () => {
    getDeviceInfoMock.mockResolvedValue({
      release_suite: 'stable',
      release_name: 'wb7-stable',
      rootfs_expanded: false,
    });
    render(<SystemPage />);
    await waitFor(() => {
      expect(screen.getByTestId('alert-info')).toBeDefined();
    });
  });

  test('shows transition offer when release_name ends with -transition', async () => {
    getDeviceInfoMock.mockResolvedValue({
      release_suite: 'testing',
      release_name: 'wb7-transition',
      rootfs_expanded: false,
    });
    render(<SystemPage />);
    await waitFor(() => {
      expect(screen.getByTestId('alert-warn')).toBeDefined();
    });
  });

  test('hides stable offer when dismissed in localStorage', async () => {
    (localStorage.getItem as any).mockImplementation(
      (k: string) => (k === 'hide-stable-notice' ? 'true' : null),
    );
    getDeviceInfoMock.mockResolvedValue({
      release_suite: 'stable',
      release_name: 'wb7-stable',
      rootfs_expanded: false,
    });
    render(<SystemPage />);
    await waitFor(() => expect(getDeviceInfoMock).toHaveBeenCalled());
    expect(screen.queryByTestId('alert-info')).toBeNull();
  });

  test('closing stable offer saves to localStorage', async () => {
    getDeviceInfoMock.mockResolvedValue({
      release_suite: 'stable',
      release_name: 'wb7-stable',
      rootfs_expanded: false,
    });
    render(<SystemPage />);
    await waitFor(() => {
      expect(screen.getByTestId('close-info')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('close-info'));
    expect(localStorage.setItem).toHaveBeenCalledWith('hide-stable-notice', 'true');
  });

  test('does not fetch device info when not admin', () => {
    authMock.hasRights.mockReturnValue(false);
    render(<SystemPage />);
    expect(getDeviceInfoMock).not.toHaveBeenCalled();
  });
});
