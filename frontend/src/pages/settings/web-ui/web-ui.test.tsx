// @vitest-environment happy-dom
import { render, screen, fireEvent, act } from '@testing-library/react';
import WebUiSettingsPage from './web-ui';

const { authMock } = vi.hoisted(() => ({
  authMock: { hasRights: vi.fn(() => true) },
}));

vi.mock('@/stores/auth', () => ({
  authStore: authMock,
  UserRole: { Operator: 'operator', Admin: 'admin' },
}));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ title, errors, children }: any) => (
    <div>
      <h1>{title}</h1>
      {errors?.map((e: any, i: number) => (
        <div key={i} data-testid="error">{e.text}</div>
      ))}
      {children}
    </div>
  ),
}));
vi.mock('./components/common-settings', () => ({
  default: () => <div data-testid="common-settings" />,
}));
vi.mock('./components/mqtt-settings', () => ({
  default: () => <div data-testid="mqtt-settings" />,
}));
vi.mock('./components/https-settings', () => ({
  default: ({ onError }: any) => (
    <div data-testid="https-settings">
      <button data-testid="trigger-error" onClick={() => onError('https err')} />
      <button data-testid="clear-error" onClick={() => onError('')} />
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.hasRights.mockReturnValue(true);
});

describe('WebUiSettingsPage', () => {
  test('renders page title', () => {
    render(<WebUiSettingsPage />);
    expect(screen.getByText('web-ui-settings.title')).toBeDefined();
  });

  test('renders all sections when user has full rights', () => {
    render(<WebUiSettingsPage />);
    expect(screen.getByTestId('mqtt-settings')).toBeDefined();
    expect(screen.getByTestId('common-settings')).toBeDefined();
    expect(screen.getByTestId('https-settings')).toBeDefined();
  });

  test('hides mqtt settings when not operator', () => {
    (authMock.hasRights as any).mockImplementation((role: string) => role !== 'operator');
    render(<WebUiSettingsPage />);
    expect(screen.queryByTestId('mqtt-settings')).toBeNull();
    expect(screen.getByTestId('common-settings')).toBeDefined();
  });

  test('hides https settings when not admin', () => {
    (authMock.hasRights as any).mockImplementation((role: string) => role !== 'admin');
    render(<WebUiSettingsPage />);
    expect(screen.queryByTestId('https-settings')).toBeNull();
    expect(screen.getByTestId('common-settings')).toBeDefined();
  });

  test('always renders common settings', () => {
    authMock.hasRights.mockReturnValue(false);
    render(<WebUiSettingsPage />);
    expect(screen.getByTestId('common-settings')).toBeDefined();
  });

  test('shows error from https settings', () => {
    render(<WebUiSettingsPage />);
    act(() => {
      fireEvent.click(screen.getByTestId('trigger-error'));
    });
    expect(screen.getByTestId('error').textContent).toBe('https err');
  });

  test('clears error from https settings', () => {
    render(<WebUiSettingsPage />);
    act(() => {
      fireEvent.click(screen.getByTestId('trigger-error'));
    });
    expect(screen.getByTestId('error')).toBeDefined();
    act(() => {
      fireEvent.click(screen.getByTestId('clear-error'));
    });
    expect(screen.queryByTestId('error')).toBeNull();
  });
});
