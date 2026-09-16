// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './login';

const { authMock, navigateMock, searchParamsMock, webauthnMock } = vi.hoisted(() => ({
  authMock: {
    isAutologin: false,
    login: vi.fn(async () => {}),
    loginWithPasskey: vi.fn(async () => {}),
  },
  navigateMock: vi.fn(),
  searchParamsMock: new URLSearchParams(),
  webauthnMock: {
    canUseWebAuthn: vi.fn(() => false),
    getWebAuthnConfig: vi.fn(async (): Promise<{ enabled: boolean; has_credentials?: boolean }> => (
      { enabled: false }
    )),
  },
}));

vi.mock('@/stores/auth', () => ({ authStore: authMock }));
vi.mock('@/services/webauthn', () => webauthnMock);
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [searchParamsMock],
  };
});
vi.mock('@/common/constants', () => ({
  APP_NAME: 'TestApp', LOGO: '/logo.png',
}));
vi.mock('@/common/links', () => ({
  documentation: { en: { main: '#docs', usersUtility: '#forgot' } },
}));
vi.mock('@/assets/icons/locale.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/key.svg', () => ({ default: () => <span data-testid="key-icon" /> }));
vi.mock('@/assets/icons/spinner.svg', () => ({
  default: ({ className }: any) => <span data-testid="loader" className={className} />,
}));
vi.mock('@/components/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
}));
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ value, options, onChange, ariaLabel }: any) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e: any) => onChange({ value: e.target.value })}
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));
vi.mock('@/components/input', () => ({
  Input: ({ value, onChange, id, ...rest }: any) => (
    <input
      id={id}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      {...(rest.required ? { required: true } : {})}
    />
  ),
}));
vi.mock('@/components/password', () => ({
  Password: ({ value, onChange, id }: any) => (
    <input
      id={id}
      type="password"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, disabled, type, icon, onClick, 'aria-label': ariaLabel }: any) => (
    <button aria-label={ariaLabel} disabled={disabled} type={type} onClick={onClick}>{icon}{label}</button>
  ),
  ButtonLink: ({ label }: any) => <a href="/">{label}</a>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.isAutologin = false;
  authMock.login.mockResolvedValue(undefined);
  authMock.loginWithPasskey.mockResolvedValue(undefined);
  webauthnMock.canUseWebAuthn.mockReturnValue(false);
  webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: false });
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => 'en'),
    setItem: vi.fn(),
  });
});

describe('LoginPage', () => {
  test('renders title and logo', () => {
    render(<LoginPage />);
    expect(screen.getByText('login.title')).toBeDefined();
    expect(screen.getByAltText('TestApp')).toBeDefined();
  });

  test('renders login and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByText('login.labels.login')).toBeDefined();
    expect(screen.getByText('login.labels.password')).toBeDefined();
  });

  test('submit button disabled when fields empty', () => {
    render(<LoginPage />);
    const btn = screen.getByText('login.buttons.login');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  test('submit button enabled when fields filled', () => {
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'admin' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'pass' } });
    const btn = screen.getByText('login.buttons.login');
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  test('calls authStore.login on submit', async () => {
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'admin' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'secret' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(authMock.login).toHaveBeenCalledWith({ login: 'admin', password: 'secret' });
    });
  });

  test('navigates to / after successful login', async () => {
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'u' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'p' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  test('navigates to returnState after login', async () => {
    searchParamsMock.set('returnState', '/dashboard');
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'u' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'p' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
    searchParamsMock.delete('returnState');
  });

  test('does a full-page navigation for a safe external return target', async () => {
    window.history.replaceState({}, '', '/login/?externalReturn=%2Fmy-service%2F');
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'u' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'p' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('/my-service/');
    });
    expect(navigateMock).not.toHaveBeenCalled();
    assignSpy.mockRestore();
    window.history.replaceState({}, '', '/');
  });

  test('ignores an unsafe external return target (open-redirect guard)', async () => {
    window.history.replaceState({}, '', '/login/?externalReturn=//evil.com');
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'u' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'p' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(assignSpy).not.toHaveBeenCalled();
    assignSpy.mockRestore();
    window.history.replaceState({}, '', '/');
  });

  test('ignores a control-character open-redirect bypass in the external return target', async () => {
    // Browsers strip the tab, turning "/\t/evil.com" into a protocol-relative "//evil.com".
    window.history.replaceState({}, '', '/login/?externalReturn=/%09/evil.com');
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'u' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'p' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(assignSpy).not.toHaveBeenCalled();
    assignSpy.mockRestore();
    window.history.replaceState({}, '', '/');
  });

  test('shows error on login failure', async () => {
    authMock.login.mockRejectedValue(new Error('fail'));
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'u' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'p' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeDefined();
      expect(screen.getByText('login.errors.failed')).toBeDefined();
    });
  });

  test('shows loader during login', async () => {
    let resolveLogin: () => void;
    authMock.login.mockImplementation(() => new Promise((r) => {
      resolveLogin = r;
    }));
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'u' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'p' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByTestId('loader')).toBeDefined();
    });
    resolveLogin!();
  });

  test('disables (but does not spin) the passkey button while password login is in progress', async () => {
    webauthnMock.canUseWebAuthn.mockReturnValue(true);
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: true, has_credentials: true });
    let resolveLogin: () => void;
    authMock.login.mockImplementation(() => new Promise((r) => (resolveLogin = r)));
    render(<LoginPage />);
    const passkeyBtn = await waitFor(() => screen.getByLabelText('login.buttons.passkey') as HTMLButtonElement);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'u' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'p' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(screen.getByTestId('loader')).toBeDefined());
    expect(passkeyBtn.disabled).toBe(true);
    resolveLogin!();
  });

  test('disables (but does not spin) the submit button while passkey login is in progress', async () => {
    webauthnMock.canUseWebAuthn.mockReturnValue(true);
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: true, has_credentials: true });
    let resolvePasskeyLogin: () => void;
    authMock.loginWithPasskey.mockImplementation(() => new Promise((r) => (resolvePasskeyLogin = r)));
    render(<LoginPage />);
    fireEvent.change(document.getElementById('username')!, { target: { value: 'u' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'p' } });
    const passkeyBtn = await waitFor(() => screen.getByLabelText('login.buttons.passkey'));
    fireEvent.click(passkeyBtn);
    const submitBtn = await waitFor(() => screen.getByText('login.buttons.login') as HTMLButtonElement);
    expect(submitBtn.disabled).toBe(true);
    expect(screen.queryByTestId('loader')).toBeNull();
    resolvePasskeyLogin!();
  });

  test('shows auto-login button when isAutologin', () => {
    authMock.isAutologin = true;
    render(<LoginPage />);
    expect(screen.getByText('login.buttons.auto-login')).toBeDefined();
  });

  test('hides auto-login button when not isAutologin', () => {
    render(<LoginPage />);
    expect(screen.queryByText('login.buttons.auto-login')).toBeNull();
  });

  test('renders forgot password link', () => {
    render(<LoginPage />);
    expect(screen.getByText('login.buttons.forgot-password')).toBeDefined();
  });

  test('renders documentation link', () => {
    render(<LoginPage />);
    expect(screen.getByText('login.labels.documentation')).toBeDefined();
  });

  test('renders language selector', () => {
    render(<LoginPage />);
    expect(screen.getByText('English')).toBeDefined();
    expect(screen.getByText('Русский')).toBeDefined();
  });

  test('language change updates localStorage', () => {
    render(<LoginPage />);
    const langSelect = screen.getByLabelText('login.buttons.choose-language');
    fireEvent.change(langSelect, { target: { value: 'ru' } });
    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'ru');
  });

  describe('passkey login', () => {
    test('hides the passkey button when the browser cannot use WebAuthn', async () => {
      render(<LoginPage />);
      await waitFor(() => {
        expect(webauthnMock.canUseWebAuthn).toHaveBeenCalled();
      });
      expect(webauthnMock.getWebAuthnConfig).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('login.buttons.passkey')).toBeNull();
    });

    test('hides the passkey button when WebAuthn is supported but disabled on the backend', async () => {
      webauthnMock.canUseWebAuthn.mockReturnValue(true);
      webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: false });
      render(<LoginPage />);
      await waitFor(() => {
        expect(webauthnMock.getWebAuthnConfig).toHaveBeenCalled();
      });
      expect(screen.queryByLabelText('login.buttons.passkey')).toBeNull();
    });

    test('hides the passkey button when the config request fails', async () => {
      webauthnMock.canUseWebAuthn.mockReturnValue(true);
      webauthnMock.getWebAuthnConfig.mockRejectedValue(new Error('network error'));
      render(<LoginPage />);
      await waitFor(() => {
        expect(webauthnMock.getWebAuthnConfig).toHaveBeenCalled();
      });
      expect(screen.queryByLabelText('login.buttons.passkey')).toBeNull();
    });

    test('hides the passkey button when WebAuthn is enabled but no passkeys are registered yet', async () => {
      webauthnMock.canUseWebAuthn.mockReturnValue(true);
      webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: true, has_credentials: false });
      render(<LoginPage />);
      await waitFor(() => {
        expect(webauthnMock.getWebAuthnConfig).toHaveBeenCalled();
      });
      expect(screen.queryByLabelText('login.buttons.passkey')).toBeNull();
    });

    test('shows the passkey button when WebAuthn is supported, enabled, and at least one passkey exists', async () => {
      webauthnMock.canUseWebAuthn.mockReturnValue(true);
      webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: true, has_credentials: true });
      render(<LoginPage />);
      await waitFor(() => {
        expect(screen.getByLabelText('login.buttons.passkey')).toBeDefined();
      });
    });

    test('renders the passkey button as a compact icon before the login button, inside the form', async () => {
      webauthnMock.canUseWebAuthn.mockReturnValue(true);
      webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: true, has_credentials: true });
      render(<LoginPage />);
      const btn = await waitFor(() => screen.getByLabelText('login.buttons.passkey'));
      const loginBtn = screen.getByText('login.buttons.login');

      expect(screen.getByTestId('key-icon')).toBeDefined();
      expect(btn.closest('form')).not.toBeNull();
      expect(btn.closest('.login-actions')).toBe(loginBtn.closest('.login-actions'));
      expect(
        btn.compareDocumentPosition(loginBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    test('does not require a login to be entered before enabling the passkey button', async () => {
      webauthnMock.canUseWebAuthn.mockReturnValue(true);
      webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: true, has_credentials: true });
      render(<LoginPage />);
      const btn = await waitFor(() => screen.getByLabelText('login.buttons.passkey') as HTMLButtonElement);

      expect(btn.disabled).toBe(false);
    });

    test('calls authStore.loginWithPasskey with no login and navigates on success', async () => {
      webauthnMock.canUseWebAuthn.mockReturnValue(true);
      webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: true, has_credentials: true });
      render(<LoginPage />);
      const btn = await waitFor(() => screen.getByLabelText('login.buttons.passkey'));

      fireEvent.click(btn);

      await waitFor(() => {
        expect(authMock.loginWithPasskey).toHaveBeenCalledWith();
        expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    test('shows the error alert when passkey login fails, without calling password login', async () => {
      webauthnMock.canUseWebAuthn.mockReturnValue(true);
      webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: true, has_credentials: true });
      authMock.loginWithPasskey.mockRejectedValue(new Error('WebAuthn authentication cancelled'));
      render(<LoginPage />);
      const btn = await waitFor(() => screen.getByLabelText('login.buttons.passkey'));

      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeDefined();
      });
      expect(authMock.login).not.toHaveBeenCalled();
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });
});
