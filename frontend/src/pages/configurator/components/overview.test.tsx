// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore, type Adapter } from '@/stores/configurator';
import { fireEvent, render, screen } from '@/test/render';
import { Overview } from './overview';

const matter: Adapter = { id: 'matter', title: { en: 'Matter' }, installed: true, active: true };

const show = (adapter: Adapter, onSelect = vi.fn()) => {
  runInAction(() => {
    configuratorStore.adapters = [adapter];
    configuratorStore.devices = [
      { id: 'a', name: 'Розетка', group: '', matter: true, rows: [] },
      { id: 'b', name: 'Лампа', group: 'Коридор', matter: false, rows: [] },
    ];
  });
  render(<Overview onSelect={onSelect} />);
  return onSelect;
};

const rows = () => screen.getAllByRole('button').filter((row) => row.tagName === 'TR').map((row) => row.textContent);

describe('Overview', () => {
  it('lists devices by group with the adapter state of each: off in the config or on', () => {
    show(matter);

    expect(screen.getByRole('columnheader', { name: 'Matter' })).toBeTruthy();
    expect(rows()).toEqual([
      expect.stringMatching(/^ЛампаКоридор0configurator\.labels\.adapter-off$/),
      expect.stringMatching(/^Розетка0configurator\.labels\.adapter-on$/),
    ]);
  });

  it('marks an enabled device when the adapter package is missing', () => {
    show({ ...matter, installed: false, active: false });
    expect(rows()[1]).toContain('configurator.labels.adapter-no-package');
  });

  it('marks an enabled device when the adapter service is stopped', () => {
    show({ ...matter, active: false });
    expect(rows()[1]).toContain('configurator.labels.adapter-service-stopped');
  });

  it('opens the device when its row is clicked', () => {
    const onSelect = show(matter);

    fireEvent.click(screen.getByText('Лампа'));

    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('sorts by the clicked column and reverses on the second click, empty groups stay at the bottom', () => {
    runInAction(() => {
      configuratorStore.adapters = [matter];
      configuratorStore.devices = [
        { id: 'a', name: 'Бра', group: 'Спальня', matter: true, rows: [] },
        { id: 'b', name: 'Акустика', group: '', matter: false, rows: [] },
        { id: 'c', name: 'Вентилятор', group: 'Кухня', matter: true, rows: [] },
      ];
    });
    render(<Overview onSelect={vi.fn()} />);
    const names = () => screen.getAllByRole('button')
      .filter((row) => row.tagName === 'TR')
      .map((row) => row.querySelector('.configurator-overviewName').textContent);

    expect(names()).toEqual(['Вентилятор', 'Бра', 'Акустика']);

    fireEvent.click(screen.getByRole('button', { name: 'configurator.labels.group' }));
    expect(names()).toEqual(['Бра', 'Вентилятор', 'Акустика']);

    fireEvent.click(screen.getByRole('button', { name: 'configurator.labels.device' }));
    expect(names()).toEqual(['Акустика', 'Бра', 'Вентилятор']);

    fireEvent.click(screen.getByRole('button', { name: 'Matter' }));
    expect(names()).toEqual(['Бра', 'Вентилятор', 'Акустика']);
  });
});
