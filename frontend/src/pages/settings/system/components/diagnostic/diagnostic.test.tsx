// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Diagnostic } from './diagnostic';

const { mqttClientMock, diagnosticProxyMock } = vi.hoisted(() => ({
  mqttClientMock: {
    whenConnected: vi.fn(() => Promise.resolve()),
    addStickySubscription: vi.fn(),
  },
  diagnosticProxyMock: {
    hasMethod: vi.fn(() => Promise.resolve(true)),
    diag: vi.fn(() => Promise.resolve()),
    status: vi.fn(() => Promise.resolve('1')),
  },
}));

vi.mock('@/services', () => ({
  mqttClient: mqttClientMock,
  diagnosticProxy: diagnosticProxyMock,
}));
vi.mock('@/utils/request', () => ({ request: { head: vi.fn() } }));
vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));
vi.mock('@/components/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, disabled, onClick }: any) => (
    <button data-testid="btn" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));
vi.mock('@/components/card', () => ({
  Card: ({ heading, children }: any) => (
    <div><h2>{heading}</h2>{children}</div>
  ),
}));
vi.mock('@/components/loader', () => ({
  Loader: ({ caption }: any) => <div data-testid="loader">{caption}</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mqttClientMock.whenConnected.mockResolvedValue(undefined);
  diagnosticProxyMock.hasMethod.mockResolvedValue(true);
  diagnosticProxyMock.status.mockResolvedValue('1');
  diagnosticProxyMock.diag.mockResolvedValue(undefined);
});

describe('Diagnostic', () => {
  test('renders heading', () => {
    render(<Diagnostic />);
    expect(screen.getByText('system.collector.title')).toBeDefined();
  });

  test('shows loader initially', () => {
    mqttClientMock.whenConnected.mockReturnValue(new Promise(() => {}));
    render(<Diagnostic />);
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  test('shows collect button when status is 1', async () => {
    render(<Diagnostic />);
    await waitFor(() => {
      expect(screen.getByTestId('btn')).toBeDefined();
    });
    const btn = screen.getByTestId('btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('system.collector.buttons.collect');
    expect(btn.disabled).toBe(false);
  });

  test('shows unavailable when status is not 1', async () => {
    diagnosticProxyMock.status.mockResolvedValue('0');
    render(<Diagnostic />);
    await waitFor(() => {
      expect(screen.getByTestId('btn')).toBeDefined();
    });
    const btn = screen.getByTestId('btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('system.collector.errors.unavailable');
    expect(btn.disabled).toBe(true);
  });

  test('shows unavailable when hasMethod returns false', async () => {
    diagnosticProxyMock.hasMethod.mockResolvedValue(false);
    render(<Diagnostic />);
    await waitFor(() => {
      expect(screen.getByTestId('btn')).toBeDefined();
    });
    const btn = screen.getByTestId('btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('system.collector.errors.unavailable');
    expect(btn.disabled).toBe(true);
  });

  test('clicking collect calls diagnosticProxy.diag', async () => {
    render(<Diagnostic />);
    await waitFor(() => {
      expect(screen.getByTestId('btn')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('btn'));
    expect(diagnosticProxyMock.diag).toHaveBeenCalled();
  });

  test('collect button disabled after click', async () => {
    render(<Diagnostic />);
    await waitFor(() => {
      expect(screen.getByTestId('btn')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('btn'));
    expect((screen.getByTestId('btn') as HTMLButtonElement).disabled).toBe(true);
  });

  test('shows error label when diag fails', async () => {
    diagnosticProxyMock.diag.mockRejectedValue(new Error('fail'));
    render(<Diagnostic />);
    await waitFor(() => {
      expect(screen.getByTestId('btn')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(screen.getByTestId('btn').textContent).toBe(
        'system.collector.errors.checkLogs',
      );
    });
  });

  test('subscribes to mqtt artifact topic', () => {
    render(<Diagnostic />);
    expect(mqttClientMock.addStickySubscription).toHaveBeenCalledWith(
      '/wb-diag-collect/artifact',
      expect.any(Function),
    );
  });

  test('label changes to collecting after click', async () => {
    render(<Diagnostic />);
    await waitFor(() => {
      expect(screen.getByTestId('btn')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('btn'));
    expect(screen.getByTestId('btn').textContent).toBe(
      'system.collector.states.collecting',
    );
  });
});
