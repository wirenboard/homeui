// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommonSettings from './common-settings';

const { authMock, dashMock, uiMock } = vi.hoisted(() => ({
  authMock: { hasRights: vi.fn(() => true) },
  dashMock: {
    dashboardsList: [
      { id: 'd1', name: 'Main', options: { isHidden: false } },
      { id: 'd2', name: 'Hidden', options: { isHidden: true } },
    ],
    description: 'My Controller',
    defaultDashboardId: 'd1',
    isShowWidgetsPage: false,
    isLoading: false,
    setDefaultDashboardId: vi.fn(),
    setDescription: vi.fn(),
    setIsShowWidgetsPage: vi.fn(),
  },
  uiMock: {
    showPageInTitle: true,
    setShowPageInTitle: vi.fn(),
  },
}));

vi.mock('@/stores/auth', () => ({
  authStore: authMock,
  UserRole: { Operator: 'operator' },
}));
vi.mock('@/stores/dashboards', () => ({ dashboardsStore: dashMock }));
vi.mock('@/stores/ui', () => ({ uiStore: uiMock }));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick }: any) => (
    <button onClick={onClick}>{label}</button>
  ),
}));
vi.mock('@/components/form', () => ({
  FormFieldGroup: ({ heading, children }: any) => (
    <fieldset><legend>{heading}</legend>{children}</fieldset>
  ),
  FormButtonGroup: ({ children }: any) => <div>{children}</div>,
  BooleanField: ({ title, value, onChange }: any) => (
    <label>
      {title}
      <input
        type="checkbox"
        data-testid={`bool-${title}`}
        checked={value}
        onChange={() => onChange(!value)}
      />
    </label>
  ),
  OptionsField: ({ title, value, options, onChange, isDisabled }: any) => (
    <label>
      {title}
      <select
        data-testid={`opt-${title}`}
        value={value}
        disabled={isDisabled}
        onChange={(e: any) => onChange(e.target.value)}
      >
        {(options || []).map((o: any) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  ),
  StringField: ({ title, value, onChange }: any) => (
    <label>
      {title}
      <input
        data-testid={`str-${title}`}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
      />
    </label>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.hasRights.mockReturnValue(true);
  dashMock.description = 'My Controller';
  dashMock.defaultDashboardId = 'd1';
  dashMock.isShowWidgetsPage = false;
  dashMock.isLoading = false;
  uiMock.showPageInTitle = true;
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => (k === 'language' ? 'en' : null)),
    setItem: vi.fn(),
  });
  Object.defineProperty(localStorage, 'show-system-devices', {
    get: () => 'no', configurable: true,
  });
});

describe('CommonSettings', () => {
  test('renders heading', () => {
    render(<CommonSettings />);
    expect(screen.getByText('web-ui-settings.labels.common-settings')).toBeDefined();
  });

  test('renders language selector', () => {
    render(<CommonSettings />);
    const sel = screen.getByTestId('opt-web-ui-settings.labels.language');
    expect(sel).toBeDefined();
    expect(screen.getByText('English')).toBeDefined();
  });

  test('renders default dashboard selector with non-hidden dashboards', () => {
    render(<CommonSettings />);
    const sel = screen.getByTestId(
      'opt-web-ui-settings.labels.default-dashboard',
    ) as HTMLSelectElement;
    const opts = Array.from(sel.querySelectorAll('option'));
    expect(opts.map((o) => o.textContent)).toContain('Main');
    expect(opts.map((o) => o.textContent)).not.toContain('Hidden');
  });

  test('renders boolean fields', () => {
    render(<CommonSettings />);
    expect(screen.getByTestId('bool-web-ui-settings.labels.show-page-in-title')).toBeDefined();
    expect(screen.getByTestId('bool-web-ui-settings.labels.show-widgets-page')).toBeDefined();
    expect(screen.getByTestId('bool-web-ui-settings.labels.show-system-devices')).toBeDefined();
  });

  test('shows name field for operators', () => {
    render(<CommonSettings />);
    expect(screen.getByTestId('str-web-ui-settings.labels.name')).toBeDefined();
  });

  test('hides name field for non-operators', () => {
    authMock.hasRights.mockReturnValue(false);
    render(<CommonSettings />);
    expect(screen.queryByTestId('str-web-ui-settings.labels.name')).toBeNull();
  });

  test('apply saves language to localStorage', async () => {
    render(<CommonSettings />);
    fireEvent.change(screen.getByTestId('opt-web-ui-settings.labels.language'), {
      target: { value: 'ru' },
    });
    fireEvent.click(screen.getByText('common.buttons.apply'));
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('language', 'ru');
    });
  });

  test('apply saves show-system-devices to localStorage', async () => {
    render(<CommonSettings />);
    fireEvent.click(screen.getByTestId('bool-web-ui-settings.labels.show-system-devices'));
    fireEvent.click(screen.getByText('common.buttons.apply'));
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('show-system-devices', 'yes');
    });
  });

  test('apply calls store setters', async () => {
    render(<CommonSettings />);
    fireEvent.click(screen.getByText('common.buttons.apply'));
    await waitFor(() => {
      expect(uiMock.setShowPageInTitle).toHaveBeenCalledWith(true);
      expect(dashMock.setDefaultDashboardId).toHaveBeenCalled();
      expect(dashMock.setDescription).toHaveBeenCalled();
      expect(dashMock.setIsShowWidgetsPage).toHaveBeenCalled();
    });
  });

  test('description field syncs from store', () => {
    render(<CommonSettings />);
    const input = screen.getByTestId('str-web-ui-settings.labels.name') as HTMLInputElement;
    expect(input.value).toBe('My Controller');
  });

  test('dashboard selector disabled while store loading', () => {
    dashMock.isLoading = true;
    render(<CommonSettings />);
    const sel = screen.getByTestId(
      'opt-web-ui-settings.labels.default-dashboard',
    ) as HTMLSelectElement;
    expect(sel.disabled).toBe(true);
  });
});
