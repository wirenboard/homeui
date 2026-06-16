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
vi.mock('./store', () => ({
  default: vi.fn(),
  ConnectionStatus: { Connected: 'ok' },
}));
vi.mock('./status', () => ({
  Status: ({ status }: any) => <span data-testid="status">{status}</span>,
}));
vi.mock('@/components/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert-info">{children}</div>,
}));
vi.mock('@/components/button', () => ({
  ButtonLink: ({ label, to }: any) => <a href={to}>{label}</a>,
}));
vi.mock('@/components/card', () => ({
  Card: ({ heading, children }: any) => (
    <div data-testid="card"><h2>{heading}</h2>{children}</div>
  ),
}));

beforeEach(() => {
  metaStoreMock.stores = {};
});

describe('CloudStatus', () => {
  test('renders nothing when no stores', () => {
    const { container } = render(<CloudStatus className="" />);
    expect(container.querySelectorAll('[data-testid="card"]')).toHaveLength(0);
  });

  test('renders nothing for uninitialized store', () => {
    metaStoreMock.stores = {
      wb: { initialized: false, provider: 'WB' },
    };
    const { container } = render(<CloudStatus className="" />);
    expect(container.querySelectorAll('[data-testid="card"]')).toHaveLength(0);
  });

  test('renders card with status for initialized store without activation link', () => {
    metaStoreMock.stores = {
      wb: {
        initialized: true,
        provider: 'WB Cloud',
        status: 'ok',
        activationLink: null,
        cloudLink: 'https://cloud.wb/ctrl/123',
      },
    };
    render(<CloudStatus className="" />);
    expect(screen.getByText(/WB Cloud/)).toBeDefined();
    expect(screen.getByTestId('status')).toBeDefined();
    expect(screen.getByText('system.cloud-status.goto-cloud')).toBeDefined();
  });

  test('renders activation link when present', () => {
    metaStoreMock.stores = {
      wb: {
        initialized: true,
        provider: 'WB Cloud',
        activationLink: 'https://activate.wb/token',
        status: null,
        cloudLink: '',
      },
    };
    render(<CloudStatus className="" />);
    expect(screen.getByText('system.cloud-status.activation-link')).toBeDefined();
    expect(screen.queryByTestId('status')).toBeNull();
  });

  test('renders multiple provider cards', () => {
    metaStoreMock.stores = {
      wb: {
        initialized: true, provider: 'WB', activationLink: null,
        status: 'ok', cloudLink: '',
      },
      other: {
        initialized: true, provider: 'Other', activationLink: null,
        status: 'ok', cloudLink: '',
      },
    };
    render(<CloudStatus className="" />);
    const cards = screen.getAllByTestId('card');
    expect(cards).toHaveLength(2);
  });
});
