// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { cloneElement } from 'react';
import { Passkeys } from './passkeys';

const { webauthnMock } = vi.hoisted(() => ({
  webauthnMock: {
    canUseWebAuthn: vi.fn(() => true),
    getWebAuthnConfig: vi.fn(async () => ({ enabled: true })),
    getPasskeys: vi.fn(async () => []),
    registerPasskey: vi.fn(async (_userId: string, name: string) => (
      { id: 'new-id', name, created_at: '2026-01-01T00:00:00Z' }
    )),
    deletePasskey: vi.fn(async () => {}),
  },
}));

vi.mock('@/services/webauthn', () => webauthnMock);
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));
vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: vi.fn(), t } }),
    Trans: ({ i18nKey, values, components }: any) => (
      <span data-testid="trans" data-i18n-key={i18nKey}>
        {components?.[0]
          ? cloneElement(components[0], undefined, values?.name)
          : values?.name}
      </span>
    ),
  };
});
vi.mock('@/components/alert', () => ({
  Alert: ({ variant, children, onClose }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
      {onClose && <button data-testid="alert-close" onClick={onClose} />}
    </div>
  ),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, disabled, isLoading, icon, 'aria-label': ariaLabel }: any) => (
    <button aria-label={ariaLabel} disabled={disabled} data-loading={isLoading} onClick={onClick}>
      {icon}{label}
    </button>
  ),
}));
vi.mock('@/components/input', () => ({
  Input: ({ value, onChange, onEnter, id, ariaLabel }: any) => (
    <input
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter') {
          onEnter?.();
        }
      }}
    />
  ),
}));
vi.mock('@/components/table', () => ({
  Table: ({ children }: any) => <table><tbody>{children}</tbody></table>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));
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

beforeEach(() => {
  vi.clearAllMocks();
  webauthnMock.canUseWebAuthn.mockReturnValue(true);
  webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: true });
  webauthnMock.getPasskeys.mockResolvedValue([]);
  webauthnMock.registerPasskey.mockImplementation(
    async (_userId: string, name: string) => ({ id: 'new-id', name, created_at: '2026-01-01T00:00:00Z' }),
  );
  webauthnMock.deletePasskey.mockResolvedValue(undefined);
});

describe('Passkeys', () => {
  test('renders nothing while WebAuthn is disabled on the backend', async () => {
    webauthnMock.getWebAuthnConfig.mockResolvedValue({ enabled: false });
    const { container } = render(<Passkeys userId="user-1" />);
    await waitFor(() => {
      expect(webauthnMock.getWebAuthnConfig).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });

  test('renders nothing when loading the config fails', async () => {
    webauthnMock.getWebAuthnConfig.mockRejectedValue(new Error('network error'));
    const { container } = render(<Passkeys userId="user-1" />);
    await waitFor(() => {
      expect(webauthnMock.getWebAuthnConfig).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });

  test('shows an unavailable warning and no add-form when the browser cannot use WebAuthn', async () => {
    webauthnMock.canUseWebAuthn.mockReturnValue(false);
    render(<Passkeys userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('users.labels.passkeys-unavailable')).toBeDefined();
    });
    expect(screen.queryByLabelText('users.labels.passkey-name')).toBeNull();
  });

  test('shows the add-passkey form when the browser supports WebAuthn', async () => {
    render(<Passkeys userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByLabelText('users.labels.passkey-name')).toBeDefined();
    });
    expect(screen.queryByText('users.labels.passkeys-unavailable')).toBeNull();
  });

  test('disables the add button until a name is entered', async () => {
    render(<Passkeys userId="user-1" />);
    const input = await waitFor(() => screen.getByLabelText('users.labels.passkey-name'));
    const addBtn = screen.getByText('users.buttons.add-passkey') as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'My key' } });
    expect(addBtn.disabled).toBe(false);
  });

  test('registers a new passkey and clears the name field', async () => {
    render(<Passkeys userId="user-1" />);
    const input = await waitFor(
      () => screen.getByLabelText('users.labels.passkey-name'),
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My key' } });

    fireEvent.click(screen.getByText('users.buttons.add-passkey'));

    await waitFor(() => {
      expect(webauthnMock.registerPasskey).toHaveBeenCalledWith('user-1', 'My key');
      expect(screen.getByText('My key')).toBeDefined();
    });
    expect(input.value).toBe('');
  });

  test('registers a new passkey when Enter is pressed in the name field', async () => {
    render(<Passkeys userId="user-1" />);
    const input = await waitFor(
      () => screen.getByLabelText('users.labels.passkey-name'),
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My key' } });

    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(webauthnMock.registerPasskey).toHaveBeenCalledWith('user-1', 'My key');
      expect(screen.getByText('My key')).toBeDefined();
    });
    expect(input.value).toBe('');
  });

  test('does not register on Enter when the name is empty', async () => {
    render(<Passkeys userId="user-1" />);
    const input = await waitFor(
      () => screen.getByLabelText('users.labels.passkey-name'),
    ) as HTMLInputElement;

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(webauthnMock.registerPasskey).not.toHaveBeenCalled();
  });

  test('shows an error and keeps the name when registration fails', async () => {
    webauthnMock.registerPasskey.mockRejectedValue(new Error('WebAuthn registration cancelled'));
    render(<Passkeys userId="user-1" />);
    const input = await waitFor(
      () => screen.getByLabelText('users.labels.passkey-name'),
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My key' } });

    fireEvent.click(screen.getByText('users.buttons.add-passkey'));

    const errorAlert = await waitFor(
      () => screen.getByText('users.errors.passkey-register-failed').closest('[data-testid="alert"]')!,
    );
    expect(errorAlert.getAttribute('data-variant')).toBe('danger');
    expect(input.value).toBe('My key');
    expect(screen.queryByText('My key')).toBeNull();

    fireEvent.click(within(errorAlert as HTMLElement).getByTestId('alert-close'));
    expect(screen.queryByText('users.errors.passkey-register-failed')).toBeNull();
  });

  test('shows an empty-state alert when there are no passkeys', async () => {
    render(<Passkeys userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('users.labels.passkeys-empty')).toBeDefined();
    });
  });

  test('renders existing passkeys with a never-used fallback', async () => {
    webauthnMock.getPasskeys.mockResolvedValue([
      { id: '1', name: 'Laptop', created_at: '2026-01-01T00:00:00Z' },
    ]);
    render(<Passkeys userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeDefined();
    });
    const row = getRow('Laptop');
    expect(within(row).getByText('users.labels.passkey-never-used')).toBeDefined();
  });

  test('deleting a passkey removes it from the list after confirmation', async () => {
    webauthnMock.getPasskeys.mockResolvedValue([
      { id: '1', name: 'Laptop', created_at: '2026-01-01T00:00:00Z' },
    ]);
    render(<Passkeys userId="user-1" />);
    await waitFor(() => screen.getByText('Laptop'));

    fireEvent.click(within(getRow('Laptop')).getByRole('button'));

    const body = await waitFor(() => screen.getByTestId('confirm-body'));
    expect(body.textContent).not.toContain('"Laptop"');
    const bold = within(body).getByText('Laptop');
    expect(bold.tagName).toBe('B');

    fireEvent.click(screen.getByTestId('confirm-ok'));

    await waitFor(() => {
      expect(webauthnMock.deletePasskey).toHaveBeenCalledWith('user-1', '1');
      expect(screen.queryByText('Laptop')).toBeNull();
    });
  });

  test('shows an error and keeps the passkey when deletion fails', async () => {
    webauthnMock.getPasskeys.mockResolvedValue([
      { id: '1', name: 'Laptop', created_at: '2026-01-01T00:00:00Z' },
    ]);
    webauthnMock.deletePasskey.mockRejectedValue(new Error('network error'));
    render(<Passkeys userId="user-1" />);
    await waitFor(() => screen.getByText('Laptop'));

    fireEvent.click(within(getRow('Laptop')).getByRole('button'));
    await waitFor(() => screen.getByTestId('confirm-dialog'));
    fireEvent.click(screen.getByTestId('confirm-ok'));

    await waitFor(() => {
      expect(screen.getByText('users.errors.passkey-delete-failed')).toBeDefined();
    });
    expect(screen.getByText('Laptop')).toBeDefined();
  });

  test('cancelling the delete confirmation keeps the passkey', async () => {
    webauthnMock.getPasskeys.mockResolvedValue([
      { id: '1', name: 'Laptop', created_at: '2026-01-01T00:00:00Z' },
    ]);
    render(<Passkeys userId="user-1" />);
    await waitFor(() => screen.getByText('Laptop'));

    fireEvent.click(within(getRow('Laptop')).getByRole('button'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('confirm-cancel'));

    expect(webauthnMock.deletePasskey).not.toHaveBeenCalled();
    expect(screen.getByText('Laptop')).toBeDefined();
  });
});
