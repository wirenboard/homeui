// @vitest-environment happy-dom
import { render, screen } from '@/test/render';
import { ConnectionState, NetworkType } from '../../stores/types';
import { ConnectionItem } from './connection-item';

vi.mock('@/assets/icons/wifi.svg', () => ({ default: () => <svg data-testid="wifi-icon" /> }));
vi.mock('@/assets/icons/signal.svg', () => ({ default: () => <svg data-testid="signal-icon" /> }));
vi.mock('@/assets/icons/ethernet.svg', () => ({ default: () => <svg data-testid="ethernet-icon" /> }));
vi.mock('@/assets/icons/acces-point.svg', () => ({ default: () => <svg data-testid="ap-icon" /> }));
vi.mock('@/assets/icons/can.svg', () => ({ default: () => <svg data-testid="can-icon" /> }));
vi.mock('@/assets/icons/warn.svg', () => ({ default: () => <svg data-testid="warn-icon" /> }));

function makeConnection(overrides: Record<string, any> = {}) {
  return {
    data: { type: NetworkType.Ethernet },
    state: ConnectionState.activated,
    name: 'Wired connection 1',
    description: 'network-connections.labels.activated',
    operator: '',
    signalQuality: 0,
    accessTechnologies: '',
    withAutoconnect: true,
    ...overrides,
  } as any;
}

describe('ConnectionItem', () => {
  test('renders connection name', () => {
    render(<ConnectionItem connection={makeConnection()} />);
    expect(screen.getByText('Wired connection 1')).toBeInTheDocument();
  });

  test('renders description when present', () => {
    render(<ConnectionItem connection={makeConnection()} />);
    expect(screen.getByText('network-connections.labels.activated')).toBeInTheDocument();
  });

  test('does not render description when empty', () => {
    render(<ConnectionItem connection={makeConnection({ description: '' })} />);
    expect(screen.queryByText('network-connections.labels.activated')).not.toBeInTheDocument();
  });

  test('renders ethernet icon for ethernet type', () => {
    render(<ConnectionItem connection={makeConnection()} />);
    expect(screen.getByTestId('ethernet-icon')).toBeInTheDocument();
  });

  test('renders wifi icon for wifi type', () => {
    render(<ConnectionItem connection={makeConnection({ data: { type: NetworkType.Wifi } })} />);
    expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
  });

  test('renders signal icon for modem type', () => {
    render(<ConnectionItem connection={makeConnection({ data: { type: NetworkType.Modem } })} />);
    expect(screen.getByTestId('signal-icon')).toBeInTheDocument();
  });

  test('renders AP icon for wifi-ap type', () => {
    render(<ConnectionItem connection={makeConnection({ data: { type: NetworkType.WifiAp } })} />);
    expect(screen.getByTestId('ap-icon')).toBeInTheDocument();
  });

  test('renders CAN icon for can type', () => {
    render(<ConnectionItem connection={makeConnection({ data: { type: NetworkType.Can } })} />);
    expect(screen.getByTestId('can-icon')).toBeInTheDocument();
  });

  test('renders warn icon for unknown type', () => {
    render(<ConnectionItem connection={makeConnection({ data: { type: 'static' } })} />);
    expect(screen.getByTestId('warn-icon')).toBeInTheDocument();
  });

  test('renders operator info when present', () => {
    render(
      <ConnectionItem
        connection={makeConnection({
          data: { type: NetworkType.Modem },
          operator: 'MTS',
          signalQuality: 80,
          accessTechnologies: 'LTE',
        })}
      />,
    );
    expect(screen.getByText('MTS - 80% (LTE)')).toBeInTheDocument();
  });

  test('does not render operator info when all empty', () => {
    render(<ConnectionItem connection={makeConnection()} />);
    expect(screen.queryByText(/% \(/)).not.toBeInTheDocument();
  });

  test('renders manual-connect label when autoconnect is disabled', () => {
    render(<ConnectionItem connection={makeConnection({ withAutoconnect: false })} />);
    expect(screen.getByText('network-connections.labels.manual-connect')).toBeInTheDocument();
  });

  test('does not render manual-connect label when autoconnect is enabled', () => {
    render(<ConnectionItem connection={makeConnection({ withAutoconnect: true })} />);
    expect(screen.queryByText('network-connections.labels.manual-connect')).not.toBeInTheDocument();
  });

  test('applies state class to root element', () => {
    const { container } = render(<ConnectionItem connection={makeConnection({ state: 'deprecated' })} />);
    expect(container.querySelector('.connectionItem.deprecated')).toBeInTheDocument();
  });

  test('does not render name when empty', () => {
    render(<ConnectionItem connection={makeConnection({ name: '' })} />);
    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
  });
});
