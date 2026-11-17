// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, Tab, TabList, TabContent } from './tabs';

const items = [
  { id: 'tab1', label: 'First' },
  { id: 'tab2', label: 'Second' },
  { id: 'tab3', label: 'Third' },
];

describe('Tabs', () => {
  test('renders all tab items', () => {
    render(<Tabs items={items} activeTab="tab1" onTabChange={vi.fn()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
  });

  test('marks active tab with aria-selected', () => {
    render(<Tabs items={items} activeTab="tab2" onTabChange={vi.fn()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  test('calls onTabChange on tab click', () => {
    const onTabChange = vi.fn();
    render(<Tabs items={items} activeTab="tab1" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Second'));
    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  test('ArrowRight moves to next tab', () => {
    const onTabChange = vi.fn();
    render(<Tabs items={items} activeTab="tab1" onTabChange={onTabChange} />);
    fireEvent.keyDown(screen.getAllByRole('tab')[0], { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  test('ArrowLeft moves to previous tab', () => {
    const onTabChange = vi.fn();
    render(<Tabs items={items} activeTab="tab2" onTabChange={onTabChange} />);
    fireEvent.keyDown(screen.getAllByRole('tab')[1], { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenCalledWith('tab1');
  });

  test('Home moves to first tab', () => {
    const onTabChange = vi.fn();
    render(<Tabs items={items} activeTab="tab3" onTabChange={onTabChange} />);
    fireEvent.keyDown(screen.getAllByRole('tab')[2], { key: 'Home' });
    expect(onTabChange).toHaveBeenCalledWith('tab1');
  });

  test('End moves to last tab', () => {
    const onTabChange = vi.fn();
    render(<Tabs items={items} activeTab="tab1" onTabChange={onTabChange} />);
    fireEvent.keyDown(screen.getAllByRole('tab')[0], { key: 'End' });
    expect(onTabChange).toHaveBeenCalledWith('tab3');
  });

  test('wraps around with ArrowRight on last tab', () => {
    const onTabChange = vi.fn();
    render(<Tabs items={items} activeTab="tab3" onTabChange={onTabChange} />);
    fireEvent.keyDown(screen.getAllByRole('tab')[2], { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledWith('tab1');
  });

  test('applies horizontal orientation', () => {
    const { container } = render(
      <Tabs
        items={items}
        activeTab="tab1"
        orientation="horizontal"
        onTabChange={vi.fn()}
      />,
    );
    expect(container.querySelector('.tabs-horizontal')).toBeTruthy();
  });

  test('applies vertical orientation by default', () => {
    const { container } = render(<Tabs items={items} activeTab="tab1" onTabChange={vi.fn()} />);
    expect(container.querySelector('.tabs-vertical')).toBeTruthy();
  });
});

describe('TabContent', () => {
  test('renders content when active', () => {
    render(<TabContent tabId="t1" activeTab="t1">Panel content</TabContent>);
    expect(screen.getByText('Panel content')).toBeDefined();
    expect(screen.getByRole('tabpanel')).toBeDefined();
  });

  test('renders nothing when not active', () => {
    render(<TabContent tabId="t1" activeTab="t2">Hidden</TabContent>);
    expect(screen.queryByText('Hidden')).toBeNull();
  });
});

describe('TabList', () => {
  test('renders tablist role', () => {
    render(
      <TabList activeTab="t1" onTabChange={vi.fn()}>
        <Tab id="t1">One</Tab>
      </TabList>,
    );
    expect(screen.getByRole('tablist')).toBeDefined();
    expect(screen.getByRole('tab')).toBeDefined();
  });
});
