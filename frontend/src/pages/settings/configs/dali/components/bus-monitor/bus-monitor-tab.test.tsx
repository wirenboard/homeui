// @vitest-environment happy-dom
import { render, screen, act } from '@testing-library/react';
import { runInAction } from 'mobx';
import { MonitorStore } from '@/stores/dali/monitor-store';
import { DaliBusMonitorContent } from './bus-monitor-tab';

vi.mock('@/services', () => import('@/test/mocks/services'));

describe('DaliBusMonitorContent', () => {
  // The capped buffer shifts on every incoming line, so a row key must not depend
  // on the row's position, or the whole list remounts each time.
  test('buffer shift keeps the DOM nodes of surviving rows', () => {
    const store = new MonitorStore();
    runInAction(() => {
      store.logs = ['line-a', 'line-b', 'line-c'];
      store.totalAppended = 3;
    });

    render(<DaliBusMonitorContent monitorStore={store} />);
    const rowB = screen.getByText('line-b').closest('.daliMonitor-row');

    act(() => {
      runInAction(() => {
        store.logs.shift();
        store.logs.push('line-d');
        store.totalAppended += 1;
      });
    });

    expect(screen.queryByText('line-a')).toBeNull();
    expect(screen.getByText('line-d')).toBeTruthy();
    expect(screen.getByText('line-b').closest('.daliMonitor-row')).toBe(rowB);
  });
});
