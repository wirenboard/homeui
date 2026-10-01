// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import { NetworkType } from '../../stores/types';
import { CreateConnectionModal } from './create-connection-modal';

vi.hoisted(() => ({
  confirmMock: vi.fn(),
  dropdownMock: vi.fn(),
}));

vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, heading, acceptLabel, isDisabled, confirmCallback, closeCallback, children }: any) =>
    isOpened ? (
      <div data-testid="confirm-dialog">
        <span>{heading}</span>
        <span>{acceptLabel}</span>
        <button data-testid="close-btn" onClick={closeCallback}>close</button>
        <button disabled={isDisabled} data-testid="confirm-btn" onClick={confirmCallback}>confirm</button>
        {children}
      </div>
    ) : null,
}));
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ value, options, onChange }: any) => (
    <select
      data-testid="dropdown"
      value={value}
      onChange={(e: any) => {
        const opt = options.find((o: any) => o.value === e.target.value);
        onChange(opt);
      }}
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));

describe('CreateConnectionModal', () => {
  const defaultProps = {
    isOpened: true,
    onClose: vi.fn(),
    onCreate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders all connection type options', () => {
    render(<CreateConnectionModal {...defaultProps} />);
    const select = screen.getByTestId('dropdown') as HTMLSelectElement;
    expect(select.options).toHaveLength(5);
  });

  test('defaults to ethernet', () => {
    render(<CreateConnectionModal {...defaultProps} />);
    const select = screen.getByTestId('dropdown') as HTMLSelectElement;
    expect(select.value).toBe(NetworkType.Ethernet);
  });

  test('calls onCreate with selected type on confirm', () => {
    render(<CreateConnectionModal {...defaultProps} />);
    const select = screen.getByTestId('dropdown') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: NetworkType.Wifi } });
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(defaultProps.onCreate).toHaveBeenCalledWith(NetworkType.Wifi);
  });

  test('calls onClose on close button', () => {
    render(<CreateConnectionModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('close-btn'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('renders heading', () => {
    render(<CreateConnectionModal {...defaultProps} />);
    expect(screen.getByText('network-connections.labels.select-type')).toBeInTheDocument();
  });

  test('does not render when isOpened is false', () => {
    render(<CreateConnectionModal {...defaultProps} isOpened={false} />);
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  test('calls onClose after confirm', () => {
    render(<CreateConnectionModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
