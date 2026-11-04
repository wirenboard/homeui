// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import { copyToClipboard } from '@/utils/clipboard';
import MatterPage from './matter';
import { PAIRING_CODE, PAIRING_CODE_GROUPED, PAIRING_PAYLOAD } from './placeholder';

const { uiMock } = vi.hoisted(() => ({
  uiMock: { modules: ['matter'], menuItems: [{ id: 'integrations' }] },
}));

vi.mock('@/stores/ui', () => ({ uiStore: uiMock }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));
vi.mock('@/assets/icons/copy.svg', () => ({ default: () => null }));
vi.mock('./example-qr.svg', () => ({
  default: (props: any) => <div data-testid="qr" {...props} />,
}));
// The shared tooltip mock drops the text, and the text is what the copy button reports.
vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children, text }: any) => <div data-tooltip={text}>{children}</div>,
}));

describe('MatterPage', () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockClear();
    uiMock.modules = ['matter'];
    uiMock.menuItems = [{ id: 'integrations' }];
  });

  it('shows the example pairing data', () => {
    render(<MatterPage />);

    expect(screen.getByText('matter.title')).toBeInTheDocument();
    expect(screen.getByTestId('qr')).toHaveAttribute('aria-label', 'matter.labels.qr-alt');
    expect(screen.getByText(PAIRING_CODE_GROUPED)).toBeInTheDocument();
    expect(screen.getByText(PAIRING_PAYLOAD)).toBeInTheDocument();
  });

  it('copies the manual code without the grouping dashes', () => {
    render(<MatterPage />);

    fireEvent.click(screen.getByLabelText('matter.buttons.copy: matter.labels.manual-code'));

    expect(copyToClipboard).toHaveBeenCalledWith(PAIRING_CODE);
  });

  it('copies the pairing payload as is', () => {
    render(<MatterPage />);

    fireEvent.click(screen.getByLabelText('matter.buttons.copy: matter.labels.payload'));

    expect(copyToClipboard).toHaveBeenCalledWith(PAIRING_PAYLOAD);
  });

  it('reports the copy instead of labelling the button', () => {
    render(<MatterPage />);

    const button = screen.getByLabelText('matter.buttons.copy: matter.labels.manual-code');
    expect(button.closest('[data-tooltip]')).toHaveAttribute('data-tooltip', 'matter.labels.copied');
  });

  it('links to the device configurator', () => {
    render(<MatterPage />);

    expect(screen.getByText('matter.labels.devices-link')).toHaveAttribute('href', '/configurator');
  });

  it('hides the pairing data when the service is not installed', () => {
    uiMock.modules = ['alice'];
    render(<MatterPage />);

    expect(screen.getByTestId('page-error')).toHaveTextContent('matter.labels.unavailable');
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument();
    expect(screen.queryByText(PAIRING_CODE_GROUPED)).not.toBeInTheDocument();
  });

  it('waits for the menu instead of calling the service missing', () => {
    // An empty menu means /ui/menu has not answered yet, not that the bridge is absent.
    uiMock.modules = [];
    uiMock.menuItems = [];
    render(<MatterPage />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('page-error')).not.toBeInTheDocument();
  });
});
