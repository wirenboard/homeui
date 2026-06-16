// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { Status } from './status';
import { ConnectionStatus } from './store';

vi.mock('@/assets/icons/refresh.svg', () => ({ default: () => null }));
vi.mock('@/components/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
}));

describe('Status', () => {
  test('shows success for Connected', () => {
    render(<Status status={ConnectionStatus.Connected} />);
    const alert = screen.getByTestId('alert');
    expect(alert.dataset.variant).toBe('success');
    expect(alert.textContent).toBe('system.cloud-status.status-ok');
  });

  test('shows warn for Starting', () => {
    render(<Status status={ConnectionStatus.Starting} />);
    const alert = screen.getByTestId('alert');
    expect(alert.dataset.variant).toBe('warn');
    expect(alert.textContent).toBe('system.cloud-status.status-starting');
  });

  test('shows warn for Connecting', () => {
    render(<Status status={ConnectionStatus.Connecting} />);
    const alert = screen.getByTestId('alert');
    expect(alert.dataset.variant).toBe('warn');
    expect(alert.textContent).toBe('system.cloud-status.status-connecting');
  });

  test('shows danger for Stopped', () => {
    render(<Status status={ConnectionStatus.Stopped} />);
    const alert = screen.getByTestId('alert');
    expect(alert.dataset.variant).toBe('danger');
    expect(alert.textContent).toBe('system.cloud-status.status-stopped');
  });

  test('shows error with status text for unknown status', () => {
    render(<Status status={'broken' as any} />);
    const alert = screen.getByTestId('alert');
    expect(alert.dataset.variant).toBe('danger');
    expect(alert.textContent).toContain('system.cloud-status.status-error');
    expect(alert.textContent).toContain('broken');
  });
});
