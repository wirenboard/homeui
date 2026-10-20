// @vitest-environment happy-dom
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { WebAuthnSettings } from './webauthn';

const { webauthnMock } = vi.hoisted(() => ({
  webauthnMock: {
    getWebAuthnConfig: vi.fn(async () => ({ domains: [], https_ready: true })),
    setWebAuthnConfig: vi.fn(async (domains: string[]) => ({ domains, https_ready: true })),
  },
}));

vi.mock('@/services/webauthn', () => webauthnMock);
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/plus.svg', () => ({ default: () => null }));
vi.mock('react-i18next', () => {
  const t = (key: string, params?: Record<string, any>) => {
    if (params?.domain !== undefined) {
      return `${key}:${params.domain}`;
    }
    return key;
  };
  return {
    useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: vi.fn(), t } }),
    Trans: ({ children }: any) => children,
  };
});
vi.mock('@/components/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, disabled, icon, 'aria-label': ariaLabel }: any) => (
    <button aria-label={ariaLabel} disabled={disabled} onClick={onClick}>{icon}{label}</button>
  ),
}));
vi.mock('@/components/form', () => ({
  StringField: ({ ariaLabel, value, error, isDisabled, onChange }: any) => (
    <>
      <input
        aria-label={ariaLabel}
        value={value}
        disabled={isDisabled}
        onChange={(e: any) => onChange(e.target.value)}
      />
      {!!error && <span data-testid="field-error">{error}</span>}
    </>
  ),
}));
vi.mock('@/components/table', () => ({
  Table: ({ children }: any) => <table><tbody>{children}</tbody></table>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));
vi.mock('@/components/tooltip', () => import('@/test/mocks/tooltip'));
vi.mock('@/components/confirm', async () => {
  const actual = await vi.importActual<any>('@/components/confirm');
  return {
    ...actual,
    Confirm: ({ isOpened, heading, confirmCallback, closeCallback, children }: any) => isOpened ? (
      <div data-testid="confirm-dialog">
        <div data-testid="confirm-heading">{heading}</div>
        <div data-testid="confirm-body">{children}</div>
        <button data-testid="confirm-ok" onClick={confirmCallback}>ok</button>
        <button data-testid="confirm-cancel" onClick={closeCallback}>cancel</button>
      </div>
    ) : null,
  };
});

function getRow(name: string) {
  return screen.getByText(name).closest('tr')!;
}

async function waitForEnabled<T extends HTMLButtonElement | HTMLInputElement>(query: () => T): Promise<T> {
  return waitFor(() => {
    const element = query();
    expect(element.disabled).toBe(false);
    return element;
  });
}

function getAddButton(): HTMLButtonElement {
  return screen.getByLabelText('web-ui-settings.buttons.webauthn-add-domain') as HTMLButtonElement;
}

async function openAddModal(): Promise<void> {
  fireEvent.click(await waitForEnabled(getAddButton));
}

function submitDomain(value: string): void {
  fireEvent.change(screen.getByLabelText('web-ui-settings.labels.webauthn-new-domain'), { target: { value } });
  fireEvent.click(screen.getByTestId('confirm-ok'));
}

const ONE_DOMAIN = ['wb.example.com'];
const TWO_DOMAINS = ['wb.example.com', 'related.example.com'];

const onError = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: [], https_ready: true });
  webauthnMock.setWebAuthnConfig.mockImplementation(async (domains: string[]) => (
    { domains, https_ready: true }
  ));
});

describe('WebAuthnSettings', () => {
  test('renders heading', async () => {
    render(<WebAuthnSettings onError={onError} />);
    expect(screen.getByText('web-ui-settings.labels.webauthn-settings')).toBeDefined();
  });

  test('shows an empty-state message in the table when no domains are configured', async () => {
    render(<WebAuthnSettings onError={onError} />);
    await waitFor(() => {
      expect(screen.getByText('web-ui-settings.labels.webauthn-domains-empty')).toBeDefined();
    });
  });

  test('renders a plain list of the configured domains, with no primary/related distinction', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: TWO_DOMAINS, https_ready: true });
    render(<WebAuthnSettings onError={onError} />);
    await waitFor(() => {
      expect(screen.getByText('related.example.com')).toBeDefined();
    });

    expect(screen.getByText('wb.example.com')).toBeDefined();
    expect(screen.queryByText('web-ui-settings.labels.webauthn-canonical')).toBeNull();
    expect(screen.queryByText('web-ui-settings.buttons.webauthn-make-canonical')).toBeNull();
  });

  test('shows an explanatory alert and disables the add and remove actions when HTTPS is not ready', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: ONE_DOMAIN, https_ready: false });
    render(<WebAuthnSettings onError={onError} />);

    await waitFor(() => {
      expect(screen.getByTestId('alert').textContent).toBe('web-ui-settings.labels.webauthn-needs-https');
    });
    expect(getAddButton().disabled).toBe(true);
    expect(
      (within(getRow('wb.example.com')).getByLabelText(
        'web-ui-settings.buttons.webauthn-remove-domain',
      ) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  test('has no "add current address" shortcut — only free-text entry', async () => {
    render(<WebAuthnSettings onError={onError} />);
    await waitFor(() => {
      expect(screen.getByText('web-ui-settings.labels.webauthn-domains-empty')).toBeDefined();
    });
    expect(screen.queryByText('web-ui-settings.buttons.webauthn-add-current')).toBeNull();
  });

  test('adds a domain via the modal opened from the table header button, and closes it on success', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: ONE_DOMAIN, https_ready: true });
    render(<WebAuthnSettings onError={onError} />);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    await openAddModal();
    expect(screen.getByTestId('confirm-dialog')).toBeDefined();

    submitDomain('related.example.com');

    await waitFor(() => {
      expect(webauthnMock.setWebAuthnConfig).toHaveBeenCalledWith(['wb.example.com', 'related.example.com']);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
  });

  test('rejects an empty domain with an inline field error, without calling the API', async () => {
    render(<WebAuthnSettings onError={onError} />);
    await openAddModal();

    submitDomain('   ');

    await waitFor(() => {
      expect(screen.getByTestId('field-error').textContent).toBe('web-ui-settings.errors.webauthn-domain-empty');
    });
    expect(webauthnMock.setWebAuthnConfig).not.toHaveBeenCalled();
  });

  test('rejects a bare IP address with an inline field error, without calling the API', async () => {
    render(<WebAuthnSettings onError={onError} />);
    await openAddModal();

    submitDomain('192.168.1.1');

    await waitFor(() => {
      expect(screen.getByTestId('field-error').textContent).toBe('web-ui-settings.errors.webauthn-domain-ip');
    });
    expect(webauthnMock.setWebAuthnConfig).not.toHaveBeenCalled();
  });

  test('rejects a domain that is already configured, without calling the API', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: ONE_DOMAIN, https_ready: true });
    render(<WebAuthnSettings onError={onError} />);
    await openAddModal();

    submitDomain('wb.example.com');

    await waitFor(() => {
      expect(screen.getByTestId('field-error').textContent).toBe('web-ui-settings.errors.webauthn-domain-duplicate');
    });
    expect(webauthnMock.setWebAuthnConfig).not.toHaveBeenCalled();
  });

  test('reopening the add modal clears a previously shown field error', async () => {
    render(<WebAuthnSettings onError={onError} />);
    await openAddModal();
    submitDomain('   ');
    await waitFor(() => expect(screen.getByTestId('field-error')).toBeDefined());

    fireEvent.click(screen.getByTestId('confirm-cancel'));
    await openAddModal();

    expect(screen.queryByTestId('field-error')).toBeNull();
  });

  test('removes a non-primary domain immediately, without a confirmation warning', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: TWO_DOMAINS, https_ready: true });
    render(<WebAuthnSettings onError={onError} />);
    const removeBtn = await waitForEnabled(
      () => within(getRow('related.example.com')).getByLabelText(
        'web-ui-settings.buttons.webauthn-remove-domain',
      ) as HTMLButtonElement,
    );

    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(webauthnMock.setWebAuthnConfig).toHaveBeenCalledWith(['wb.example.com']);
    });
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  test('warns before removing the primary (oldest) domain, and only applies after confirming', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: ONE_DOMAIN, https_ready: true });
    render(<WebAuthnSettings onError={onError} />);
    const removeBtn = await waitForEnabled(
      () => within(getRow('wb.example.com')).getByLabelText(
        'web-ui-settings.buttons.webauthn-remove-domain',
      ) as HTMLButtonElement,
    );

    fireEvent.click(removeBtn);

    const body = await waitFor(() => screen.getByTestId('confirm-body'));
    expect(body.textContent).toContain('wb.example.com');
    expect(webauthnMock.setWebAuthnConfig).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('confirm-ok'));

    await waitFor(() => {
      expect(webauthnMock.setWebAuthnConfig).toHaveBeenCalledWith([]);
    });
  });

  test('cancelling the primary-domain removal confirmation keeps it configured', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: ONE_DOMAIN, https_ready: true });
    render(<WebAuthnSettings onError={onError} />);
    const removeBtn = await waitForEnabled(
      () => within(getRow('wb.example.com')).getByLabelText(
        'web-ui-settings.buttons.webauthn-remove-domain',
      ) as HTMLButtonElement,
    );

    fireEvent.click(removeBtn);
    await waitFor(() => screen.getByTestId('confirm-dialog'));

    fireEvent.click(screen.getByTestId('confirm-cancel'));

    expect(webauthnMock.setWebAuthnConfig).not.toHaveBeenCalled();
  });

  test('removing the primary domain while another remains promotes it automatically', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: TWO_DOMAINS, https_ready: true });
    render(<WebAuthnSettings onError={onError} />);
    const removeBtn = await waitForEnabled(
      () => within(getRow('wb.example.com')).getByLabelText(
        'web-ui-settings.buttons.webauthn-remove-domain',
      ) as HTMLButtonElement,
    );

    fireEvent.click(removeBtn);
    await waitFor(() => screen.getByTestId('confirm-body'));
    fireEvent.click(screen.getByTestId('confirm-ok'));

    await waitFor(() => {
      expect(webauthnMock.setWebAuthnConfig).toHaveBeenCalledWith(['related.example.com']);
    });
  });

  test('surfaces the error inline and keeps the modal open when adding a domain fails', async () => {
    webauthnMock.setWebAuthnConfig.mockRejectedValue(new Error('bad domain'));
    render(<WebAuthnSettings onError={onError} />);
    await openAddModal();
    submitDomain('wb.example.com');

    await waitFor(() => {
      expect(screen.getByTestId('field-error').textContent).toContain('web-ui-settings.errors.setup-webauthn');
    });
    expect((screen.getByLabelText('web-ui-settings.labels.webauthn-new-domain') as HTMLInputElement).value)
      .toBe('wb.example.com');
    expect(screen.getByTestId('confirm-dialog')).toBeDefined();
    expect(onError).toHaveBeenCalledWith('');
  });

  test('surfaces the error via onError when removing a domain fails', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: TWO_DOMAINS, https_ready: true });
    webauthnMock.setWebAuthnConfig.mockRejectedValue(new Error('cannot remove'));
    render(<WebAuthnSettings onError={onError} />);
    const removeBtn = await waitForEnabled(
      () => within(getRow('related.example.com')).getByLabelText(
        'web-ui-settings.buttons.webauthn-remove-domain',
      ) as HTMLButtonElement,
    );

    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('web-ui-settings.errors.setup-webauthn'));
    });
  });

  test('surfaces an error via onError when the initial config fetch fails', async () => {
    webauthnMock.getWebAuthnConfig.mockRejectedValue(new Error('network down'));
    render(<WebAuthnSettings onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('web-ui-settings.errors.get-webauthn-status'),
      );
    });
  });

  test('clears a previously reported error once an update succeeds', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: ONE_DOMAIN, https_ready: true });
    render(<WebAuthnSettings onError={onError} />);
    await openAddModal();
    submitDomain('related.example.com');

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('');
    });
  });

  test('reports the loaded domains via onDomainsChange', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ domains: TWO_DOMAINS, https_ready: true });
    const onDomainsChange = vi.fn();
    render(<WebAuthnSettings onError={onError} onDomainsChange={onDomainsChange} />);

    await waitFor(() => {
      expect(onDomainsChange).toHaveBeenCalledWith(TWO_DOMAINS);
    });
  });

  test('keeps polling while HTTPS is not yet ready, and stops once it is', async () => {
    vi.useFakeTimers();
    webauthnMock.getWebAuthnConfig
      .mockResolvedValueOnce({ domains: ONE_DOMAIN, https_ready: false })
      .mockResolvedValueOnce({ domains: ONE_DOMAIN, https_ready: false })
      .mockResolvedValueOnce({ domains: ONE_DOMAIN, https_ready: true });

    await act(async () => {
      render(<WebAuthnSettings onError={onError} />);
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(webauthnMock.getWebAuthnConfig).toHaveBeenCalledTimes(3);
    expect(screen.queryByTestId('alert')).toBeNull();
    vi.useRealTimers();
  });
});
