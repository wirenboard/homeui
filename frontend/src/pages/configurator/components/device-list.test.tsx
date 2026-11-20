// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore } from '@/stores/configurator';
import { fireEvent, render, screen } from '@/test/render';
import { DeviceList } from './device-list';

vi.mock('@/assets/icons/plus.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));

const show = (groups: string[]) => {
  runInAction(() => {
    configuratorStore.devices = groups.map((group, index) => ({
      id: `d${index}`, name: `Устройство ${index}`, group, matter: true, rows: [],
    }));
  });
  render(<DeviceList onAdd={vi.fn()} onAddEmpty={vi.fn()} onAddWb={vi.fn()} onClear={vi.fn()} onSelect={vi.fn()} />);
};

const sections = () => Array.from(document.querySelectorAll('section')).map((section) => [
  section.querySelector('h4')?.textContent ?? null,
  Array.from(section.querySelectorAll('.configurator-listTitle')).map((title) => title.textContent),
]);

// Меню рисуется в общий контейнер всплывающих блоков приложения.
const openMenu = () => {
  if (!document.querySelector('.floating')) {
    document.body.appendChild(Object.assign(document.createElement('div'), { className: 'floating' }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.add' }));
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

  it('offers three ways to add a device in a menu, each closes the menu and starts its own way', () => {
    const ways = [vi.fn(), vi.fn(), vi.fn()];
    render(
      <DeviceList onAddEmpty={ways[0]} onAdd={ways[1]} onAddWb={ways[2]} onClear={vi.fn()} onSelect={vi.fn()} />,
    );

    ways.forEach((way, index) => {
      openMenu();
      fireEvent.click(screen.getAllByRole('menuitem')[index]);

      expect(way).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).toBeNull();
    });
  });
});
