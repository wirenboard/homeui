// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UsersPage from './users';

const { storeMock, authMock } = vi.hoisted(() => ({
  storeMock: {
    users: [] as any[],
    errors: [],
    autologinOptions: [{ value: null, label: 'No autologin' }],
    autologinUser: null,
    onlyOneAdmin: false,
    httpsDomainName: '',
    showEnableHttpsConfirmModal: null as any,
    loadUsers: vi.fn(async () => {}),
    addUser: vi.fn(async () => {}),
    editUser: vi.fn(async () => {}),
    deleteUser: vi.fn(async () => {}),
    setAutologinUser: vi.fn(async () => {}),
    confirmSetupHttps: vi.fn(async () => true),
  },
  authMock: {
    hasRights: vi.fn(() => true),
    areUsersConfigured: true,
    users: [] as any[],
    me: { id: 'u1', autologin: false },
  },
}));

vi.mock('./page-store', () => ({ store: storeMock }));
vi.mock('@/stores/auth', () => ({
  authStore: authMock,
  UserRole: { Admin: 'admin', Operator: 'operator', User: 'user' },
}));
vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));
vi.mock('@/components/confirm', () => ({
  Confirm: ({
    isOpened, heading, confirmCallback, closeCallback, children,
  }: any) => isOpened ? (
    <div data-testid="confirm-dialog">
      <div data-testid="confirm-heading">{heading}</div>
      <div data-testid="confirm-body">{children}</div>
      <button data-testid="confirm-ok" onClick={confirmCallback}>ok</button>
      <button data-testid="confirm-cancel" onClick={closeCallback}>cancel</button>
    </div>
  ) : null,
  useConfirm: () => [vi.fn(), false, vi.fn(), vi.fn()],
}));
vi.mock('@/common/links', () => ({
  documentation: { en: { users: '#users-docs' } },
}));
vi.mock('@/assets/icons/edit.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));
vi.mock('@/components/tooltip', () => import('@/test/mocks/tooltip'));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({
    title, isLoading, errors, actions, children,
  }: any) => (
    <div>
      {isLoading && <div data-testid="loading" />}
      <h1>{title}</h1>
      <div data-testid="actions">{actions}</div>
      {errors?.map((e: any, i: number) => (
        <div key={i} data-testid="error">{e.text}</div>
      ))}
      {children}
    </div>
  ),
}));
vi.mock('@/components/button', () => ({
  Button: ({
    label, onClick, disabled, variant, 'aria-labelledby': ariaLabelledby,
  }: any) => (
    <button
      aria-label={ariaLabelledby}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  ),
}));
vi.mock('@/components/table', () => ({
  Table: ({ children }: any) => <table><tbody>{children}</tbody></table>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ value, options, onChange }: any) => (
    <select
      data-testid="autologin-dropdown"
      value={value || ''}
      onChange={(e: any) => onChange({ value: e.target.value || null })}
    >
      {(options || []).map((o: any) => (
        <option key={String(o.value)} value={o.value || ''}>{o.label}</option>
      ))}
    </select>
  ),
}));
vi.mock('@/pages/settings/users/components/edit-user', () => ({
  EditUserModal: ({ user, onSave, onCancel }: any) => (
    <div data-testid="edit-modal">
      <span data-testid="edit-user-login">{user?.login || 'new'}</span>
      <button
        data-testid="modal-save"
        onClick={() => onSave({ login: 'test', password: 'pw', type: 'user' })}
      >
        save
      </button>
      <button data-testid="modal-cancel" onClick={onCancel}>cancel</button>
    </div>
  ),
}));

const makeUser = (id: string, login: string, type = 'user') => ({
  id, login, type, autologin: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  authMock.hasRights.mockReturnValue(true);
  authMock.areUsersConfigured = true;
  authMock.users = [
    makeUser('u1', 'admin1', 'admin'),
    makeUser('u2', 'viewer', 'user'),
  ];
  storeMock.users = [...authMock.users];
  storeMock.errors = [];
  storeMock.onlyOneAdmin = true;
  storeMock.autologinOptions = [
    { value: null, label: 'No autologin' },
    { value: 'u2', label: 'viewer' },
  ];
  storeMock.autologinUser = null;
  storeMock.loadUsers.mockResolvedValue(undefined);
});

describe('UsersPage', () => {
  test('renders page title', () => {
    render(<UsersPage />);
    expect(screen.getByText('users.title')).toBeDefined();
  });

  test('calls loadUsers on mount', () => {
    render(<UsersPage />);
    expect(storeMock.loadUsers).toHaveBeenCalled();
  });

  test('skips loadUsers if not admin', () => {
    authMock.hasRights.mockReturnValue(false);
    render(<UsersPage />);
    expect(storeMock.loadUsers).not.toHaveBeenCalled();
  });

  test('renders user rows', () => {
    render(<UsersPage />);
    expect(screen.getByText('admin1')).toBeDefined();
    expect(screen.getAllByText('viewer').length).toBeGreaterThanOrEqual(1);
  });

  test('renders user type labels', () => {
    render(<UsersPage />);
    expect(screen.getByText('users.labels.admin')).toBeDefined();
    expect(screen.getByText('users.labels.user')).toBeDefined();
  });

  test('renders add button', () => {
    render(<UsersPage />);
    expect(screen.getByText('users.buttons.add')).toBeDefined();
  });

  test('add button opens edit modal', () => {
    render(<UsersPage />);
    expect(screen.queryByTestId('edit-modal')).toBeNull();
    fireEvent.click(screen.getByText('users.buttons.add'));
    expect(screen.getByTestId('edit-modal')).toBeDefined();
    expect(screen.getByTestId('edit-user-login').textContent).toBe('new');
  });

  test('edit button opens modal with user data', () => {
    render(<UsersPage />);
    const editBtns = screen.getAllByLabelText(/username-viewer edit/);
    fireEvent.click(editBtns[0]);
    expect(screen.getByTestId('edit-modal')).toBeDefined();
    expect(screen.getByTestId('edit-user-login').textContent).toBe('viewer');
  });

  test('cancel modal closes it', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByText('users.buttons.add'));
    expect(screen.getByTestId('edit-modal')).toBeDefined();
    fireEvent.click(screen.getByTestId('modal-cancel'));
    expect(screen.queryByTestId('edit-modal')).toBeNull();
  });

  test('save in modal calls addUser for new user', async () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByText('users.buttons.add'));
    fireEvent.click(screen.getByTestId('modal-save'));
    await waitFor(() => {
      expect(storeMock.addUser).toHaveBeenCalledWith({
        login: 'test', password: 'pw', type: 'user',
      });
    });
  });

  test('save in modal calls editUser for existing user', async () => {
    render(<UsersPage />);
    fireEvent.click(screen.getAllByLabelText(/username-viewer edit/)[0]);
    fireEvent.click(screen.getByTestId('modal-save'));
    await waitFor(() => {
      expect(storeMock.editUser).toHaveBeenCalled();
    });
  });

  test('delete button opens confirm dialog', () => {
    storeMock.onlyOneAdmin = false;
    render(<UsersPage />);
    fireEvent.click(screen.getByLabelText(/username-admin1 delete/));
    expect(screen.getByTestId('confirm-dialog')).toBeDefined();
    expect(screen.getByTestId('confirm-heading').textContent)
      .toBe('users.labels.confirm-delete-heading');
  });

  test('confirm delete calls deleteUser', async () => {
    storeMock.onlyOneAdmin = false;
    render(<UsersPage />);
    fireEvent.click(screen.getByLabelText(/username-admin1 delete/));
    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() => {
      expect(storeMock.deleteUser).toHaveBeenCalledWith('u1');
    });
  });

  test('cancel delete closes dialog', () => {
    storeMock.onlyOneAdmin = false;
    render(<UsersPage />);
    fireEvent.click(screen.getByLabelText(/username-admin1 delete/));
    fireEvent.click(screen.getByTestId('confirm-cancel'));
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  test('delete disabled for sole admin', () => {
    storeMock.onlyOneAdmin = true;
    render(<UsersPage />);
    const btn = screen.getByLabelText(/username-admin1 delete/) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test('renders autologin dropdown', () => {
    render(<UsersPage />);
    expect(screen.getByText('users.labels.autologin')).toBeDefined();
    expect(screen.getByTestId('autologin-dropdown')).toBeDefined();
  });

  test('autologin change calls setAutologinUser', () => {
    render(<UsersPage />);
    fireEvent.change(screen.getByTestId('autologin-dropdown'), {
      target: { value: 'u2' },
    });
    expect(storeMock.setAutologinUser).toHaveBeenCalledWith('u2');
  });

  test('shows errors from store', () => {
    storeMock.errors = [{ variant: 'danger', text: 'Some error' }];
    render(<UsersPage />);
    expect(screen.getByText('Some error')).toBeDefined();
  });
});
