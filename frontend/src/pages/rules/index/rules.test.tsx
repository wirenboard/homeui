// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RulesPage from './rules';

const { rulesMock } = vi.hoisted(() => ({
  rulesMock: {
    rules: [] as any[],
    getList: vi.fn(async () => []),
    copyRule: vi.fn(async () => {}),
    deleteRule: vi.fn(async () => {}),
    changeState: vi.fn(async () => {}),
  },
}));

vi.mock('@/stores/rules', () => ({ rulesStore: rulesMock }));
vi.mock('@/stores/auth', () => ({
  authStore: { hasRights: vi.fn(() => true) },
  UserRole: { Admin: 'admin' },
}));
vi.mock('@/common/links', () => ({
  documentation: { en: { rules: '#rules-docs' } },
}));
vi.mock('@/assets/icons/copy.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/warn.svg', () => ({
  default: (props: any) => <span data-testid="warn-icon" role={props.role} />,
}));
vi.mock('@/components/tooltip', () => import('@/test/mocks/tooltip'));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ title, isLoading, errors, actions, children }: any) => (
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
  Button: ({ onClick, 'aria-label': ariaLabel }: any) => (
    <button aria-label={ariaLabel} onClick={onClick} />
  ),
  ButtonLink: ({ label, to }: any) => <a href={to}>{label}</a>,
}));
vi.mock('@/components/switch', () => ({
  Switch: ({ id, value, onChange }: any) => (
    <input
      type="checkbox"
      data-testid={`switch-${id}`}
      checked={value}
      onChange={onChange}
    />
  ),
}));
vi.mock('@/components/table', () => ({
  Table: ({ children, isLoading }: any) => (
    <table>
      {isLoading && <caption data-testid="table-loading">updating</caption>}
      <tbody>{children}</tbody>
    </table>
  ),
  TableRow: ({ children, 'aria-label': ariaLabel }: any) => (
    <tr aria-label={ariaLabel}>{children}</tr>
  ),
  TableCell: ({ children }: any) => <td>{children}</td>,
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
}));

const makeRule = (path: string, enabled = true, hasError = false) => ({
  virtualPath: path,
  enabled,
  error: hasError ? { message: 'Some error' } : undefined,
  rules: [],
  devices: [],
  timers: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  rulesMock.rules = [
    makeRule('rule1.js'),
    makeRule('rule2.js', false),
    makeRule('rule3.js', true, true),
  ];
  rulesMock.getList.mockResolvedValue([]);
});

describe('RulesPage', () => {
  test('calls getList on mount', () => {
    render(<RulesPage />);
    expect(rulesMock.getList).toHaveBeenCalled();
  });

  test('shows loading state initially', () => {
    rulesMock.getList.mockReturnValue(new Promise(() => {}));
    render(<RulesPage />);
    expect(screen.getByTestId('loading')).toBeDefined();
  });

  test('hides loading after getList resolves', async () => {
    render(<RulesPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });
  });

  test('renders page title', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByText('rules.title')).toBeDefined();
  });

  test('renders create button', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByText('rules.buttons.create')).toBeDefined();
  });

  test('renders all rules in the table', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByText('rule1.js')).toBeDefined();
    expect(screen.getByText('rule2.js')).toBeDefined();
    expect(screen.getByText('rule3.js')).toBeDefined();
  });

  test('shows warn icon for rules with errors', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getAllByTestId('warn-icon')).toHaveLength(1);
  });

  test('switch reflects rule enabled state', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    const sw1 = screen.getByTestId('switch-rule1.js') as HTMLInputElement;
    const sw2 = screen.getByTestId('switch-rule2.js') as HTMLInputElement;
    expect(sw1.checked).toBe(true);
    expect(sw2.checked).toBe(false);
  });

  test('toggle switch calls changeState', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    fireEvent.click(screen.getByTestId('switch-rule1.js'));
    await waitFor(() => {
      expect(rulesMock.changeState).toHaveBeenCalledWith('rule1.js', false);
    });
  });

  test('copy button calls copyRule', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    const copyBtn = screen.getByLabelText('rules.buttons.copy rule1.js');
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(rulesMock.copyRule).toHaveBeenCalledWith('rule1.js');
    });
  });

  test('delete button opens confirm dialog', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    const delBtn = screen.getByLabelText('rules.buttons.delete rule1.js');
    fireEvent.click(delBtn);
    expect(screen.getByTestId('confirm-dialog')).toBeDefined();
    expect(screen.getByTestId('confirm-heading').textContent)
      .toBe('rules.labels.delete-title');
  });

  test('confirm delete calls deleteRule and closes dialog', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    fireEvent.click(screen.getByLabelText('rules.buttons.delete rule2.js'));
    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() => {
      expect(rulesMock.deleteRule).toHaveBeenCalledWith('rule2.js');
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
  });

  test('cancel delete closes dialog without deleting', async () => {
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    fireEvent.click(screen.getByLabelText('rules.buttons.delete rule1.js'));
    fireEvent.click(screen.getByTestId('confirm-cancel'));
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(rulesMock.deleteRule).not.toHaveBeenCalled();
  });

  test('shows MQTT error on getList failure', async () => {
    rulesMock.getList.mockRejectedValue({ data: 'MqttConnectionError' });
    render(<RulesPage />);
    await waitFor(() => {
      expect(screen.getByText('rules.errors.mqtt-connection')).toBeDefined();
    });
  });

  test('hides create button when errors present', async () => {
    rulesMock.getList.mockRejectedValue({ data: 'MqttConnectionError' });
    render(<RulesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeDefined();
    });
    expect(screen.queryByText('rules.buttons.create')).toBeNull();
  });

  test('renders empty table when no rules', async () => {
    rulesMock.rules = [];
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    const rows = screen.queryAllByRole('row');
    expect(rows).toHaveLength(0);
  });

  test('shows table loading during copy', async () => {
    rulesMock.copyRule.mockImplementation(
      () => new Promise((r) => setTimeout(r, 100)),
    );
    render(<RulesPage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    fireEvent.click(screen.getByLabelText('rules.buttons.copy rule1.js'));
    expect(screen.getByTestId('table-loading')).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByTestId('table-loading')).toBeNull();
    });
  });
});
