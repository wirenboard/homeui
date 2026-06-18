// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { MqttSettings } from './mqtt-settings';

vi.mock('@/components/button', () => ({
  Button: ({ label, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>{label}</button>
  ),
}));
vi.mock('@/components/form', () => ({
  FormFieldGroup: ({ heading, children }: any) => (
    <fieldset><legend>{heading}</legend>{children}</fieldset>
  ),
  FormButtonGroup: ({ children }: any) => <div data-testid="btn-group">{children}</div>,
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
  StringField: ({ title, value, isDisabled, onChange }: any) => (
    <label>
      {title}
      <input
        data-testid={`str-${title}`}
        value={value}
        disabled={isDisabled}
        onChange={(e: any) => onChange(e.target.value)}
      />
    </label>
  ),
  PasswordField: ({ title, value, isDisabled, onChange }: any) => (
    <label>
      {title}
      <input
        type="password"
        data-testid={`pwd-${title}`}
        value={value}
        disabled={isDisabled}
        onChange={(e: any) => onChange(e.target.value)}
      />
    </label>
  ),
}));

let storage: Record<string, string>;
let reloadMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  storage = {};
  reloadMock = vi.fn();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => storage[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      storage[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete storage[k];
    }),
  });
  Object.defineProperty(localStorage, 'user', { get: () => storage.user, configurable: true });
  Object.defineProperty(localStorage, 'password', { get: () => storage.password, configurable: true });
  Object.defineProperty(localStorage, 'prefix', { get: () => storage.prefix, configurable: true });
  vi.stubGlobal('location', { reload: reloadMock });
});

describe('MqttSettings', () => {
  test('renders heading', () => {
    render(<MqttSettings />);
    expect(screen.getByText('web-ui-settings.labels.mqtt-settings')).toBeDefined();
  });

  test('renders all fields', () => {
    render(<MqttSettings />);
    expect(screen.getByTestId('bool-web-ui-settings.labels.use-mqtt-password')).toBeDefined();
    expect(screen.getByTestId('str-web-ui-settings.labels.mqtt-login')).toBeDefined();
    expect(screen.getByTestId('pwd-web-ui-settings.labels.mqtt-password')).toBeDefined();
    expect(screen.getByTestId('bool-web-ui-settings.labels.add-prefix-to-topic')).toBeDefined();
  });

  test('apply button disabled initially (not dirty)', () => {
    render(<MqttSettings />);
    const btn = screen.getByText('common.buttons.apply') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test('login/password fields disabled when useMqttPassword off', () => {
    render(<MqttSettings />);
    const login = screen.getByTestId('str-web-ui-settings.labels.mqtt-login') as HTMLInputElement;
    const pwd = screen.getByTestId('pwd-web-ui-settings.labels.mqtt-password') as HTMLInputElement;
    expect(login.disabled).toBe(true);
    expect(pwd.disabled).toBe(true);
  });

  test('enabling mqtt password enables fields', () => {
    render(<MqttSettings />);
    fireEvent.click(screen.getByTestId('bool-web-ui-settings.labels.use-mqtt-password'));
    const login = screen.getByTestId('str-web-ui-settings.labels.mqtt-login') as HTMLInputElement;
    expect(login.disabled).toBe(false);
  });

  test('disabling mqtt password clears login and password', () => {
    storage.user = 'admin';
    storage.password = 'secret';
    render(<MqttSettings />);
    fireEvent.click(screen.getByTestId('bool-web-ui-settings.labels.use-mqtt-password'));
    const login = screen.getByTestId('str-web-ui-settings.labels.mqtt-login') as HTMLInputElement;
    const pwd = screen.getByTestId('pwd-web-ui-settings.labels.mqtt-password') as HTMLInputElement;
    expect(login.value).toBe('');
    expect(pwd.value).toBe('');
  });

  test('apply with password saves to localStorage and reloads', () => {
    render(<MqttSettings />);
    fireEvent.click(screen.getByTestId('bool-web-ui-settings.labels.use-mqtt-password'));
    fireEvent.change(screen.getByTestId('str-web-ui-settings.labels.mqtt-login'), {
      target: { value: 'user1' },
    });
    fireEvent.change(screen.getByTestId('pwd-web-ui-settings.labels.mqtt-password'), {
      target: { value: 'pass1' },
    });
    fireEvent.click(screen.getByText('common.buttons.apply'));
    expect(localStorage.setItem).toHaveBeenCalledWith('user', 'user1');
    expect(localStorage.setItem).toHaveBeenCalledWith('password', 'pass1');
    expect(reloadMock).toHaveBeenCalled();
  });

  test('apply without password removes credentials from localStorage', () => {
    storage.user = 'u';
    storage.password = 'p';
    render(<MqttSettings />);
    fireEvent.click(screen.getByTestId('bool-web-ui-settings.labels.use-mqtt-password'));
    fireEvent.click(screen.getByText('common.buttons.apply'));
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    expect(localStorage.removeItem).toHaveBeenCalledWith('password');
  });

  test('apply saves prefix setting', () => {
    storage.user = 'u';
    storage.password = 'p';
    render(<MqttSettings />);
    fireEvent.click(screen.getByTestId('bool-web-ui-settings.labels.add-prefix-to-topic'));
    fireEvent.click(screen.getByText('common.buttons.apply'));
    expect(localStorage.setItem).toHaveBeenCalledWith('prefix', 'true');
  });

  test('apply disabled when password enabled but fields empty', () => {
    render(<MqttSettings />);
    fireEvent.click(screen.getByTestId('bool-web-ui-settings.labels.use-mqtt-password'));
    const btn = screen.getByText('common.buttons.apply') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test('apply enabled when password on and fields filled', () => {
    render(<MqttSettings />);
    fireEvent.click(screen.getByTestId('bool-web-ui-settings.labels.use-mqtt-password'));
    fireEvent.change(screen.getByTestId('str-web-ui-settings.labels.mqtt-login'), {
      target: { value: 'u' },
    });
    fireEvent.change(screen.getByTestId('pwd-web-ui-settings.labels.mqtt-password'), {
      target: { value: 'p' },
    });
    const btn = screen.getByText('common.buttons.apply') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  test('reads initial values from localStorage', () => {
    storage.user = 'myuser';
    storage.password = 'mypass';
    storage.prefix = 'true';
    render(<MqttSettings />);
    const login = screen.getByTestId('str-web-ui-settings.labels.mqtt-login') as HTMLInputElement;
    const pwd = screen.getByTestId('pwd-web-ui-settings.labels.mqtt-password') as HTMLInputElement;
    expect(login.value).toBe('myuser');
    expect(pwd.value).toBe('mypass');
    const prefixCb = screen.getByTestId(
      'bool-web-ui-settings.labels.add-prefix-to-topic',
    ) as HTMLInputElement;
    expect(prefixCb.checked).toBe(true);
  });
});
