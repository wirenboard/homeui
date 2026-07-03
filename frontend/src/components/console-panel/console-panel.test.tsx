// @vitest-environment happy-dom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { consolePanelStore as store } from '@/stores/console-panel';
import type { ConsoleTab } from '@/stores/console-panel';
import { ConsolePanel } from './console-panel';

vi.mock('react-responsive', () => ({
  useMediaQuery: () => false,
}));

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/assets/icons/chevron-right-double.svg', () => ({
  default: (props: any) => <svg data-testid="chevron-icon" {...props} />,
}));
vi.mock('@/assets/icons/clear.svg', () => ({
  default: (props: any) => <svg data-testid="clear-icon" {...props} />,
}));
vi.mock('@/assets/icons/close.svg', () => ({
  default: (props: any) => <svg data-testid="close-icon" {...props} />,
}));
vi.mock('@/assets/icons/layout-bottom.svg', () => ({
  default: (props: any) => <svg data-testid="layout-bottom-icon" {...props} />,
}));
vi.mock('@/assets/icons/layout-right.svg', () => ({
  default: (props: any) => <svg data-testid="layout-right-icon" {...props} />,
}));

let mockOverflowIds = new Set<string>();
vi.mock('./get-overflow-ids', () => ({
  getOverflowIds: () => mockOverflowIds,
}));

vi.stubGlobal('ResizeObserver', class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
});

const OVERFLOW_LABEL = 'console-panel.buttons.more-tabs';

const makeTab = (id: string, overrides: Partial<ConsoleTab> = {}): ConsoleTab => ({
  id,
  label: id,
  renderContent: () => null,
  ...overrides,
});

describe('ConsolePanel overflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOverflowIds = new Set();
    store.tabs = [];
    store.activeTabId = null;
    store.isVisible = false;
  });

  test('does not render overflow button when no tabs overflow', () => {
    store.registerTab(makeTab('a'));
    store.registerTab(makeTab('b'));
    mockOverflowIds = new Set();

    render(<ConsolePanel />);

    expect(screen.queryByLabelText(OVERFLOW_LABEL)).toBeNull();
  });

  test('renders overflow button when tabs overflow', () => {
    store.registerTab(makeTab('a'));
    store.registerTab(makeTab('b'));
    store.registerTab(makeTab('c'));
    mockOverflowIds = new Set(['c']);

    render(<ConsolePanel />);

    expect(screen.getByLabelText(OVERFLOW_LABEL)).toBeTruthy();
  });

  test('overflow button has correct aria attributes', () => {
    store.registerTab(makeTab('a'));
    store.registerTab(makeTab('b'));
    mockOverflowIds = new Set(['b']);

    render(<ConsolePanel />);

    const btn = screen.getByLabelText(OVERFLOW_LABEL);
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  test('clicking overflow button opens menu', () => {
    store.registerTab(makeTab('a'));
    store.registerTab(makeTab('b'));
    store.registerTab(makeTab('c'));
    mockOverflowIds = new Set(['b', 'c']);

    render(<ConsolePanel />);

    const btn = screen.getByLabelText(OVERFLOW_LABEL);
    fireEvent.click(btn);

    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu');
    expect(menu).toBeTruthy();
    const items = within(menu).getAllByRole('menuitem');
    expect(items).toHaveLength(2);
  });

  test('overflow menu shows labels of hidden tabs', () => {
    store.registerTab(makeTab('tab-x', { label: 'Tab X' }));
    store.registerTab(makeTab('tab-y', { label: 'Tab Y' }));
    store.registerTab(makeTab('tab-z', { label: 'Tab Z' }));
    mockOverflowIds = new Set(['tab-y', 'tab-z']);

    render(<ConsolePanel />);

    fireEvent.click(screen.getByLabelText(OVERFLOW_LABEL));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Tab Y')).toBeTruthy();
    expect(within(menu).getByText('Tab Z')).toBeTruthy();
  });

  test('clicking menu item activates tab and closes menu', () => {
    store.registerTab(makeTab('a'));
    store.registerTab(makeTab('b', { label: 'Tab B' }));
    mockOverflowIds = new Set(['b']);

    render(<ConsolePanel />);

    fireEvent.click(screen.getByLabelText(OVERFLOW_LABEL));
    const menu = screen.getByRole('menu');
    fireEvent.click(within(menu).getByText('Tab B'));

    expect(store.activeTabId).toBe('b');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('clicking close button in overflow menu removes tab', () => {
    store.registerTab(makeTab('a'));
    store.registerTab(makeTab('b', { label: 'Tab B', closable: true }));
    mockOverflowIds = new Set(['b']);

    render(<ConsolePanel />);

    fireEvent.click(screen.getByLabelText(OVERFLOW_LABEL));

    const menu = screen.getByRole('menu');
    const closeBtn = within(menu).getByTestId('close-icon');
    fireEvent.click(closeBtn.closest('[role="button"]')!);

    expect(store.tabs.find((t) => t.id === 'b')).toBeUndefined();
  });

  test('non-closable tabs in overflow menu have no close button', () => {
    store.registerTab(makeTab('a'));
    store.registerTab(makeTab('b', { label: 'Tab B', closable: false }));
    mockOverflowIds = new Set(['b']);

    render(<ConsolePanel />);

    fireEvent.click(screen.getByLabelText(OVERFLOW_LABEL));

    const menu = screen.getByRole('menu');
    expect(within(menu).queryByTestId('close-icon')).toBeNull();
  });

  test('active tab in overflow menu has active class', () => {
    store.registerTab(makeTab('a'));
    store.registerTab(makeTab('b'));
    store.setActiveTab('b');
    mockOverflowIds = new Set(['b']);

    render(<ConsolePanel />);

    fireEvent.click(screen.getByLabelText(OVERFLOW_LABEL));

    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items[0].classList.contains('consolePanel-overflowMenuItemActive')).toBe(true);
  });

  test('hidden measurement row renders all tabs with aria-hidden', () => {
    store.registerTab(makeTab('a', { label: 'Alpha' }));
    store.registerTab(makeTab('b', { label: 'Beta' }));
    store.registerTab(makeTab('c', { label: 'Gamma' }));
    mockOverflowIds = new Set(['b', 'c']);

    const { container } = render(<ConsolePanel />);

    const measureRow = container.querySelector('.consolePanel-tabsMeasure');
    expect(measureRow).toBeTruthy();
    expect(measureRow!.getAttribute('aria-hidden')).toBe('true');
    expect(measureRow!.textContent).toContain('Alpha');
    expect(measureRow!.textContent).toContain('Beta');
    expect(measureRow!.textContent).toContain('Gamma');
  });

  test('visible tabs exclude overflowed ones', () => {
    store.registerTab(makeTab('a', { label: 'Alpha' }));
    store.registerTab(makeTab('b', { label: 'Beta' }));
    store.registerTab(makeTab('c', { label: 'Gamma' }));
    mockOverflowIds = new Set(['c']);

    const { container } = render(<ConsolePanel />);

    const wrapper = container.querySelector('.consolePanel-tabsWrapper');
    expect(wrapper!.textContent).toContain('Alpha');
    expect(wrapper!.textContent).toContain('Beta');
    expect(wrapper!.textContent).not.toContain('Gamma');
  });

  test('toggling overflow button twice closes menu', () => {
    store.registerTab(makeTab('a'));
    store.registerTab(makeTab('b'));
    mockOverflowIds = new Set(['b']);

    render(<ConsolePanel />);

    const btn = screen.getByLabelText(OVERFLOW_LABEL);
    fireEvent.click(btn);
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.click(btn);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('shows only overflow button when all tabs overflow', () => {
    store.registerTab(makeTab('a', { label: 'Alpha' }));
    store.registerTab(makeTab('b', { label: 'Beta' }));
    mockOverflowIds = new Set(['a', 'b']);

    const { container } = render(<ConsolePanel />);

    const wrapper = container.querySelector('.consolePanel-tabsWrapper');
    expect(wrapper!.querySelectorAll('[role="tab"]')).toHaveLength(0);

    expect(screen.getByLabelText(OVERFLOW_LABEL)).toBeTruthy();

    fireEvent.click(screen.getByLabelText(OVERFLOW_LABEL));
    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items).toHaveLength(2);
    expect(within(menu).getByText('Alpha')).toBeTruthy();
    expect(within(menu).getByText('Beta')).toBeTruthy();
  });
});

describe('ConsolePanel tab slots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOverflowIds = new Set();
    store.tabs = [];
    store.activeTabId = null;
    store.isVisible = false;
  });

  test('renders the active tab toolbar and content', () => {
    store.registerTab(makeTab('a', {
      renderToolbar: () => <button>my-toolbar-btn</button>,
      renderContent: () => <div>my-content</div>,
    }));

    render(<ConsolePanel />);

    expect(screen.getByText('my-toolbar-btn')).toBeTruthy();
    expect(screen.getByText('my-content')).toBeTruthy();
  });
});
