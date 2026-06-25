// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { EditUserModal } from './edit-user';

vi.mock('@/stores/auth', () => ({
  UserRole: { User: 'user', Operator: 'operator', Admin: 'admin' },
}));
vi.mock('@/components/confirm', () => ({
  Confirm: ({
    heading, isDisabled, confirmCallback, closeCallback, children,
  }: any) => (
    <div data-testid="modal">
      <div data-testid="heading">{heading}</div>
      {children}
      <button
        data-testid="save-btn"
        disabled={isDisabled}
        onClick={confirmCallback}
      >
        save
      </button>
      <button data-testid="cancel-btn" onClick={closeCallback}>cancel</button>
    </div>
  ),
}));
vi.mock('@/components/input', () => ({
  Input: ({ value, onChange }: any) => (
    <input
      data-testid="login-input"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('@/components/password', () => ({
  Password: ({ value, onChange, autoComplete }: any) => (
    <input
      type="password"
      data-testid={`pwd-${autoComplete}`}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ value, options, isDisabled, onChange }: any) => (
    <select
      data-testid="type-select"
      value={value}
      disabled={isDisabled}
      onChange={(e: any) => onChange({ value: e.target.value })}
    >
      {(options || []).map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));

const defaultProps = {
  user: {} as any,
  isLoading: false,
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EditUserModal', () => {
  test('renders heading', () => {
    render(<EditUserModal {...defaultProps} />);
    expect(screen.getByTestId('heading').textContent).toBe('users.labels.user');
  });

  test('renders all form fields', () => {
    render(<EditUserModal {...defaultProps} />);
    expect(screen.getByTestId('login-input')).toBeDefined();
    expect(screen.getByTestId('pwd-new-password')).toBeDefined();
    expect(screen.getByTestId('pwd-off')).toBeDefined();
    expect(screen.getByTestId('type-select')).toBeDefined();
  });

  test('save disabled when login empty', () => {
    render(<EditUserModal {...defaultProps} />);
    const btn = screen.getByTestId('save-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test('save disabled when password empty', () => {
    render(<EditUserModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('login-input'), {
      target: { value: 'admin' },
    });
    const btn = screen.getByTestId('save-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test('save disabled when passwords mismatch', () => {
    render(<EditUserModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('login-input'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByTestId('pwd-new-password'), {
      target: { value: 'pass1' },
    });
    fireEvent.change(screen.getByTestId('pwd-off'), {
      target: { value: 'pass2' },
    });
    const btn = screen.getByTestId('save-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test('shows password mismatch message', () => {
    render(<EditUserModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('pwd-new-password'), {
      target: { value: 'a' },
    });
    fireEvent.change(screen.getByTestId('pwd-off'), {
      target: { value: 'b' },
    });
    expect(screen.getByText('users.labels.password-mismatch')).toBeDefined();
  });

  test('save enabled when form valid', () => {
    render(<EditUserModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('login-input'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByTestId('pwd-new-password'), {
      target: { value: 'pass' },
    });
    fireEvent.change(screen.getByTestId('pwd-off'), {
      target: { value: 'pass' },
    });
    const btn = screen.getByTestId('save-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  test('save calls onSave with form data', () => {
    render(<EditUserModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('login-input'), {
      target: { value: 'newuser' },
    });
    fireEvent.change(screen.getByTestId('pwd-new-password'), {
      target: { value: 'secret' },
    });
    fireEvent.change(screen.getByTestId('pwd-off'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByTestId('save-btn'));
    expect(defaultProps.onSave).toHaveBeenCalledWith({
      login: 'newuser', password: 'secret', type: 'user',
    });
  });

  test('cancel calls onCancel', () => {
    render(<EditUserModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('cancel-btn'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  test('populates fields for existing user', () => {
    const user = { login: 'bob', type: 'operator' } as any;
    render(<EditUserModal {...defaultProps} user={user} />);
    const login = screen.getByTestId('login-input') as HTMLInputElement;
    expect(login.value).toBe('bob');
    const typeSelect = screen.getByTestId('type-select') as HTMLSelectElement;
    expect(typeSelect.value).toBe('operator');
  });

  test('readOnly user forces admin type and disables dropdown', () => {
    const user = { login: 'admin1', type: 'admin', readOnly: true } as any;
    render(<EditUserModal {...defaultProps} user={user} />);
    const typeSelect = screen.getByTestId('type-select') as HTMLSelectElement;
    expect(typeSelect.value).toBe('admin');
    expect(typeSelect.disabled).toBe(true);
  });

  test('type selector has all role options', () => {
    render(<EditUserModal {...defaultProps} />);
    const opts = screen.getByTestId('type-select').querySelectorAll('option');
    const labels = Array.from(opts).map((o) => o.textContent);
    expect(labels).toContain('users.labels.user');
    expect(labels).toContain('users.labels.operator');
    expect(labels).toContain('users.labels.admin');
  });

  test('type change updates selected role', () => {
    render(<EditUserModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('type-select'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByTestId('login-input'), {
      target: { value: 'x' },
    });
    fireEvent.change(screen.getByTestId('pwd-new-password'), {
      target: { value: 'p' },
    });
    fireEvent.change(screen.getByTestId('pwd-off'), {
      target: { value: 'p' },
    });
    fireEvent.click(screen.getByTestId('save-btn'));
    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'admin' }),
    );
  });
});
