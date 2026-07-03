// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { rulesStore } from '@/stores/rules/index';
import { RulesConsoleContent } from './rules-console-tab';

vi.mock('@/services', () => import('@/test/mocks/services'));

describe('RulesConsoleContent', () => {
  beforeEach(() => {
    rulesStore.logs = [
      { level: 'info', payload: 'info msg', time: 1 },
      { level: 'error', payload: 'error msg', time: 2 },
      { level: 'info', payload: 'second info', time: 3 },
    ] as any;
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
});
