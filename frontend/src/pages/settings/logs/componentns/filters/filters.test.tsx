// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import { LogsFilters } from './filters';

vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ ariaLabel, value, options, onChange, isDisabled, placeholder, multiselect }: any) => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      disabled={isDisabled}
      onChange={(e: any) => {
        if (multiselect) {
          onChange(options?.filter((o: any) => e.target.value === String(o.value)) || []);
        } else {
          onChange(options?.find((o: any) => String(o.value) === e.target.value) || null);
        }
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options?.map((o: any) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  ),
}));
vi.mock('@/components/datetime-picker', () => ({
  DateTimePicker: ({ placeholder, value, onChange }: any) => (
    <input
      data-testid="datetime-picker"
      placeholder={placeholder}
      value={value ? value.toISOString() : ''}
      onChange={(e: any) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));
vi.mock('@/components/input', () => ({
  Input: ({ value, onChange, ...rest }: any) => (
    <input
      data-testid="pattern-input"
      aria-label={rest['aria-label']}
      placeholder={rest.placeholder}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('@/components/toggle-button', () => ({
  ToggleButton: ({ label, enabled, onClick, ...rest }: any) => (
    <button
      data-testid={`toggle-${label}`}
      aria-label={rest['aria-label']}
      data-enabled={enabled}
      onClick={onClick}
    >
      {label}
    </button>
  ),
}));
vi.mock('@/components/form', () => ({
  BooleanField: ({ title, value, onChange }: any) => (
    <label data-testid="live-update">
      <input type="checkbox" checked={value} onChange={(e: any) => onChange(e.target.checked)} />
      {title}
    </label>
  ),
}));
vi.mock('@/components/form-group', () => ({
  FormGroup: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/assets/icons/info.svg', () => ({
  default: (props: any) => <svg data-testid="info-icon" {...props} />,
}));

function makeStore(overrides: Record<string, any> = {}) {
  return {
    services: ['svc-a', 'svc-b'],
    boots: [{ hash: 'boot1', start: 1700000000 }],
    ...overrides,
  } as any;
}

function makeFilter(overrides: Record<string, any> = {}) {
  return {
    levels: null, boot: null, service: null, time: null,
    regex: false, pattern: '', 'case-sensitive': true,
    ...overrides,
  };
}

function renderFilters(props: Record<string, any> = {}) {
  const defaultProps = {
    store: makeStore(),
    filter: makeFilter(),
    liveUpdate: false,
    onFilterChange: vi.fn(),
    onLiveUpdateChange: vi.fn(),
    ...props,
  };
  return { ...render(<LogsFilters {...defaultProps as any} />), ...defaultProps };
}

describe('LogsFilters', () => {
  test('renders service dropdown with options', () => {
    renderFilters();
    expect(screen.getByLabelText('logs.labels.choose-service')).toBeInTheDocument();
    expect(screen.getByText('svc-a')).toBeInTheDocument();
    expect(screen.getByText('svc-b')).toBeInTheDocument();
  });

  test('calls onFilterChange on service select', () => {
    const { onFilterChange } = renderFilters();
    fireEvent.change(screen.getByLabelText('logs.labels.choose-service'), {
      target: { value: 'svc-b' },
    });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ service: 'svc-b' }));
  });

  test('disables service dropdown when no services', () => {
    renderFilters({ store: makeStore({ services: [] }) });
    expect(screen.getByLabelText('logs.labels.choose-service')).toBeDisabled();
  });

  test('renders boot dropdown', () => {
    renderFilters();
    expect(screen.getByLabelText('logs.labels.choose-boot')).toBeInTheDocument();
  });

  test('disables boot dropdown when no boots', () => {
    renderFilters({ store: makeStore({ boots: [] }) });
    expect(screen.getByLabelText('logs.labels.choose-boot')).toBeDisabled();
  });

  test('renders level dropdown with all 8 levels', () => {
    renderFilters();
    expect(screen.getByLabelText('logs.labels.choose-level')).toBeInTheDocument();
    for (const label of ['Emergency', 'Alert', 'Critical', 'Error', 'Warning', 'Notice', 'Info', 'Debug']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test('renders datetime picker', () => {
    renderFilters();
    expect(screen.getByTestId('datetime-picker')).toBeInTheDocument();
  });

  test('renders pattern input', () => {
    renderFilters();
    expect(screen.getByTestId('pattern-input')).toBeInTheDocument();
  });

  test('case-sensitive toggle enabled by default', () => {
    renderFilters();
    expect(screen.getByTestId('toggle-Aa')).toHaveAttribute('data-enabled', 'true');
  });

  test('toggles case-sensitive on click', () => {
    const { onFilterChange } = renderFilters();
    fireEvent.click(screen.getByTestId('toggle-Aa'));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ 'case-sensitive': false }),
    );
  });

  test('regex toggle disabled by default', () => {
    renderFilters();
    expect(screen.getByTestId('toggle-Re')).toHaveAttribute('data-enabled', 'false');
  });

  test('toggles regex on click', () => {
    const { onFilterChange } = renderFilters();
    fireEvent.click(screen.getByTestId('toggle-Re'));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ regex: true }));
  });

  test('renders live update checkbox', () => {
    renderFilters();
    expect(screen.getByTestId('live-update')).toBeInTheDocument();
  });

  test('toggles live update', () => {
    const { onLiveUpdateChange } = renderFilters();
    fireEvent.click(screen.getByTestId('live-update').querySelector('input')!);
    expect(onLiveUpdateChange).toHaveBeenCalledWith(true);
  });

  test('renders info link to regex docs', () => {
    renderFilters();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
