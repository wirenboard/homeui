// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { CloudStatus } from './cloud-status';

const { metaStoreMock } = vi.hoisted(() => ({
  metaStoreMock: { stores: {} as any },
}));

vi.mock('@/utils/use-store', () => ({
  useStore: () => metaStoreMock,
}));
vi.mock('./meta-store', () => ({
  CloudStatusMetaStore: vi.fn(),
}));
vi.mock('./status', () => ({
  Status: ({ status }: any) => <span data-testid="status">{status}</span>,
}));
vi.mock('@/components/button', () => ({
  ButtonLink: ({ label, to }: any) => <a href={to}>{label}</a>,
}));
vi.mock('@/components/card', () => ({
  Card: ({ heading, children }: any) => (
    <div data-testid="card"><h2>{heading}</h2>{children}</div>
  ),
}));

describe('CloudStatus link to the controller page', () => {
  test('a stopped agent without a known cloud URL gets the status but no link to nowhere', () => {
    metaStoreMock.stores = {
      wb: { initialized: true, provider: 'WB Cloud', status: 'stopped', activationLink: null, cloudLink: '' },
    };

    render(<CloudStatus className="" />);

    expect(screen.getByTestId('status').textContent).toBe('stopped');
    expect(screen.queryByText('system.cloud-status.goto-cloud')).toBeNull();
  });
});
