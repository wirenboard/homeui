// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { ConsolePanelContent } from './console-panel-content';

function makeTab(logs: any[] = [], overrides: Record<string, any> = {}) {
  return {
    getLogs: vi.fn(() => logs),
    renderLog: vi.fn((log: any, i: number) => <div key={i} data-testid={`log-${i}`}>{log.text}</div>),
    filterLevels: null,
    getLogLevel: null,
    ...overrides,
  } as any;
}

describe('ConsolePanelContent', () => {
  test('renders logs from tab', () => {
    const tab = makeTab([{ text: 'Line 1' }, { text: 'Line 2' }]);
    render(<ConsolePanelContent tab={tab} filter="all" />);

    expect(screen.getByText('Line 1')).toBeDefined();
    expect(screen.getByText('Line 2')).toBeDefined();
    expect(tab.renderLog).toHaveBeenCalledTimes(2);
  });

  test('renders empty content for no logs', () => {
    const tab = makeTab([]);
    const { container } = render(<ConsolePanelContent tab={tab} filter="all" />);
    expect(container.querySelector('[role="log"]')).toBeTruthy();
    expect(tab.renderLog).not.toHaveBeenCalled();
  });

  test('has role="log" and aria-live', () => {
    const tab = makeTab([]);
    const { container } = render(<ConsolePanelContent tab={tab} filter="all" />);
    const logEl = container.querySelector('[role="log"]');
    expect(logEl).toBeTruthy();
    expect(logEl!.getAttribute('aria-live')).toBe('polite');
  });

  test('filters logs by level when filter is set', () => {
    const logs = [
      { text: 'info msg', level: 'info' },
      { text: 'error msg', level: 'error' },
      { text: 'info msg 2', level: 'info' },
    ];
    const tab = makeTab(logs, {
      filterLevels: [{ value: 'all', label: 'All' }, { value: 'error', label: 'Error' }],
      getLogLevel: (log: any) => log.level,
    });

    render(<ConsolePanelContent tab={tab} filter="error" />);

    expect(tab.renderLog).toHaveBeenCalledTimes(1);
    expect(tab.renderLog).toHaveBeenCalledWith(logs[1], 0);
  });

  test('shows all logs when filter is "all"', () => {
    const logs = [{ text: 'a', level: 'info' }, { text: 'b', level: 'error' }];
    const tab = makeTab(logs, {
      filterLevels: [{ value: 'all', label: 'All' }],
      getLogLevel: (log: any) => log.level,
    });

    render(<ConsolePanelContent tab={tab} filter="all" />);

    expect(tab.renderLog).toHaveBeenCalledTimes(2);
  });
});
