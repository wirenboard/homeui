// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore } from '@/stores/configurator';
import { fireEvent, render, screen } from '@/test/render';
import { DeviceList } from './device-list';

vi.mock('@/assets/icons/plus.svg', () => ({ default: () => null }));

const show = (groups: string[]) => {
  runInAction(() => {
    configuratorStore.devices = groups.map((group, index) => ({
      id: `d${index}`, name: `Устройство ${index}`, group, adapterSettings: { matter: true }, rows: [],
    }));
  });
  render(<DeviceList onAdd={vi.fn()} onAddEmpty={vi.fn()} onClear={vi.fn()} onSelect={vi.fn()} />);
};

// Ветки дерева верхнего уровня: заголовок группы (null у плоского списка) и устройства в ней.
const sections = () => {
  const top = Array.from(document.querySelectorAll('[role="tree"] > [role="treeitem"]'));
  if (!top.some((node) => node.querySelector('.configurator-treeGroup'))) {
    return [[null, top.map((node) => node.querySelector('.configurator-listTitle').textContent)]];
  }
  return top.map((node) => [
    node.querySelector('.configurator-treeGroup').textContent,
    Array.from(node.querySelectorAll('.configurator-listTitle')).map((title) => title.textContent),
  ]);
};

describe('DeviceList', () => {
  it('puts devices under headings of their groups by name, the ones without a group last', () => {
    show(['Кухня', '', 'Коридор', 'Кухня']);

    expect(sections()).toEqual([
      ['Коридор', ['Устройство 2']],
      ['Кухня', ['Устройство 0', 'Устройство 3']],
      ['configurator.labels.no-group', ['Устройство 1']],
    ]);
  });

  it('shows a plain list without headings when no device has a group', () => {
    show(['', '']);

    expect(sections()).toEqual([[null, ['Устройство 0', 'Устройство 1']]]);
  });

  it('adds a device by type with the main button, from the controller and removes all from the more menu', async () => {
    const onAdd = vi.fn();
    const onAddEmpty = vi.fn();
    const onClear = vi.fn();
    runInAction(() => {
      configuratorStore.devices = [{ id: 'd0', name: 'Лампа', group: '', adapterSettings: { matter: true }, rows: [] }];
    });
    // Popup рисует меню в портал .floating из разметки приложения.
    document.body.insertAdjacentHTML('beforeend', '<div class="floating"></div>');
    render(<DeviceList onAdd={onAdd} onAddEmpty={onAddEmpty} onClear={onClear} onSelect={vi.fn()} />);
    const choose = async (item: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.more-actions' }));
      fireEvent.click(await screen.findByRole('button', { name: item }));
    };

    fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.add' }));
    expect([onAddEmpty, onAdd, onClear].map((fn) => fn.mock.calls.length)).toEqual([1, 0, 0]);
    await choose('configurator.labels.devices-title');
    expect([onAddEmpty, onAdd, onClear].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 0]);
    expect(screen.queryByRole('button', { name: 'configurator.buttons.clear-all' })).toBeNull();
    await choose('configurator.buttons.clear-all');
    expect([onAddEmpty, onAdd, onClear].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('selects a device by a click in the tree and ignores a click on a group', () => {
    const onSelect = vi.fn();
    runInAction(() => {
      configuratorStore.devices = [{ id: 'd0', name: 'Лампа', group: 'Кухня', adapterSettings: {}, rows: [] }];
    });
    render(<DeviceList onAdd={vi.fn()} onAddEmpty={vi.fn()} onClear={vi.fn()} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Кухня'));
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Лампа'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(configuratorStore.selection).toEqual({ id: 'd0' });
  });
});
