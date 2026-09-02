// @vitest-environment happy-dom
import { render, screen, act } from '@testing-library/react';
import { runInAction } from 'mobx';
import { rulesStore } from '@/stores/rules/index';
import { RulesConsoleContent } from './rules-console-tab';

vi.mock('@/services', () => import('@/test/mocks/services'));

describe('RulesConsoleContent', () => {
  beforeEach(() => {
    runInAction(() => {
      rulesStore.logs = [
        { level: 'info', payload: 'info msg', time: 1 },
        { level: 'error', payload: 'error msg', time: 2 },
        { level: 'info', payload: 'second info', time: 3 },
      ] as any;
      // In production logs is always a suffix of the appended stream. Without
      // this the component derives negative row keys.
      rulesStore.totalAppended = rulesStore.logs.length;
    });
    rulesStore.setLogLevelFilter('all');
  });

  test('shows every log when the filter is "all"', () => {
    render(<RulesConsoleContent />);

    expect(screen.getByText('info msg')).toBeTruthy();
    expect(screen.getByText('error msg')).toBeTruthy();
    expect(screen.getByText('second info')).toBeTruthy();
  });

  test('filters logs by level', () => {
    rulesStore.setLogLevelFilter('error');

    render(<RulesConsoleContent />);

    expect(screen.getByText('error msg')).toBeTruthy();
    expect(screen.queryByText('info msg')).toBeNull();
    expect(screen.queryByText('second info')).toBeNull();
  });

  // The capped buffer shifts on every incoming log, so a row key must not depend
  // on the row's position, or the whole list remounts each time.
  test('buffer shift keeps the DOM nodes of surviving rows', () => {
    render(<RulesConsoleContent />);
    const errorRow = screen.getByText('error msg').closest('.consolePanel-log');

    act(() => {
      runInAction(() => {
        rulesStore.logs.shift();
        rulesStore.logs.push({ level: 'info', payload: 'fourth info', time: 4 } as any);
        rulesStore.totalAppended += 1;
      });
    });

    expect(screen.queryByText('info msg')).toBeNull();
    expect(screen.getByText('fourth info')).toBeTruthy();
    expect(screen.getByText('error msg').closest('.consolePanel-log')).toBe(errorRow);
  });
});
