// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import HttpsSettings from './https-settings';

const { httpsMock } = vi.hoisted(() => ({
  httpsMock: {
    isHttpsEnabled: vi.fn(async () => false),
    setupHttps: vi.fn(async () => {}),
    getHttpsCertificateStatus: vi.fn(async () => 'valid'),
  },
}));

vi.mock('@/utils/https-utils', () => ({
  ...httpsMock,
  CertificateStatus: {
    VALID: 'valid',
    REQUESTING: 'requesting',
    UNAVAILABLE: 'unavailable',
  },
}));
vi.mock('@/components/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
}));
vi.mock('@/components/form', () => ({
  FormFieldGroup: ({ heading, children }: any) => (
    <fieldset><legend>{heading}</legend>{children}</fieldset>
  ),
  BooleanField: ({ title, value, isDisabled, onChange }: any) => (
    <label>
      {title}
      <input
        type="checkbox"
        data-testid="https-toggle"
        checked={value}
        disabled={isDisabled}
        onChange={() => onChange(!value)}
      />
    </label>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  httpsMock.isHttpsEnabled.mockResolvedValue(false);
  httpsMock.setupHttps.mockResolvedValue(undefined);
  httpsMock.getHttpsCertificateStatus.mockResolvedValue('valid');
});

describe('HttpsSettings', () => {
  const onError = vi.fn();

  test('renders heading', () => {
    render(<HttpsSettings onError={onError} />);
    expect(screen.getByText('web-ui-settings.labels.https-settings')).toBeDefined();
  });

  test('renders toggle initially disabled', () => {
    httpsMock.isHttpsEnabled.mockReturnValue(new Promise(() => {}));
    render(<HttpsSettings onError={onError} />);
    const toggle = screen.getByTestId('https-toggle') as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
  });

  test('enables toggle after isHttpsEnabled resolves', async () => {
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      const toggle = screen.getByTestId('https-toggle') as HTMLInputElement;
      expect(toggle.disabled).toBe(false);
    });
  });

  test('sets switch state from isHttpsEnabled', async () => {
    httpsMock.isHttpsEnabled.mockResolvedValue(true);
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      const toggle = screen.getByTestId('https-toggle') as HTMLInputElement;
      expect(toggle.checked).toBe(true);
    });
  });

  test('calls onError when isHttpsEnabled fails', async () => {
    httpsMock.isHttpsEnabled.mockRejectedValue(new Error('fail'));
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('web-ui-settings.errors.get-https-status'),
      );
    });
  });

  test('calls setupHttps when toggling on', async () => {
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      expect((screen.getByTestId('https-toggle') as HTMLInputElement).disabled).toBe(false);
    });
    fireEvent.click(screen.getByTestId('https-toggle'));
    await waitFor(() => {
      expect(httpsMock.setupHttps).toHaveBeenCalledWith(true);
    });
  });

  test('clears error on successful setup', async () => {
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      expect((screen.getByTestId('https-toggle') as HTMLInputElement).disabled).toBe(false);
    });
    fireEvent.click(screen.getByTestId('https-toggle'));
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('');
    });
  });

  test('reverts switch and reports error on setup failure', async () => {
    httpsMock.setupHttps.mockRejectedValue(new Error('setup fail'));
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      expect((screen.getByTestId('https-toggle') as HTMLInputElement).disabled).toBe(false);
    });
    fireEvent.click(screen.getByTestId('https-toggle'));
    await waitFor(() => {
      const toggle = screen.getByTestId('https-toggle') as HTMLInputElement;
      expect(toggle.checked).toBe(false);
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('web-ui-settings.errors.setup-https'),
      );
    });
  });

  test('shows cert status banner when https enabled', async () => {
    httpsMock.isHttpsEnabled.mockResolvedValue(true);
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeDefined();
    });
  });

  test('hides cert status banner when https disabled', async () => {
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      expect((screen.getByTestId('https-toggle') as HTMLInputElement).disabled).toBe(false);
    });
    expect(screen.queryByTestId('alert')).toBeNull();
  });

  test('shows valid cert status', async () => {
    httpsMock.isHttpsEnabled.mockResolvedValue(true);
    httpsMock.getHttpsCertificateStatus.mockResolvedValue('valid');
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      const alert = screen.getByTestId('alert');
      expect(alert.textContent).toBe('web-ui-settings.labels.https-cert-valid');
      expect(alert.dataset.variant).toBe('success');
    });
  });

  test('shows unavailable cert status', async () => {
    httpsMock.isHttpsEnabled.mockResolvedValue(true);
    httpsMock.getHttpsCertificateStatus.mockResolvedValue('unavailable');
    render(<HttpsSettings onError={onError} />);
    await waitFor(() => {
      const alert = screen.getByTestId('alert');
      expect(alert.textContent).toBe('web-ui-settings.labels.https-cert-unavailable');
      expect(alert.dataset.variant).toBe('danger');
    });
  });

  test('polls when cert status is requesting', async () => {
    vi.useFakeTimers();
    httpsMock.isHttpsEnabled.mockResolvedValue(true);
    httpsMock.getHttpsCertificateStatus
      .mockResolvedValueOnce('requesting')
      .mockResolvedValueOnce('valid');

    await act(async () => {
      render(<HttpsSettings onError={onError} />);
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(httpsMock.getHttpsCertificateStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('alert').textContent)
      .toBe('web-ui-settings.labels.https-cert-valid');
    vi.useRealTimers();
  });
});
