// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore, type Adapter, type Device } from '@/stores/configurator';
import { fireEvent, render, screen } from '@/test/render';
import { AdapterSwitches } from './adapter-switches';

const matter: Adapter = {
  id: 'matter',
  title: { ru: 'Matter', en: 'Matter' },
  package: 'wb-mqtt-matter-bridge',
  url: 'integrations/matter',
  active: true,
};

const device = (fields: Partial<Device> = {}): Device =>
  ({ id: 'd', name: 'd', group: '', adapterSettings: { matter: true }, rows: [], ...fields });

const show = (adapters: Adapter[], target = device()) => {
  runInAction(() => {
    configuratorStore.adapters = adapters;
  });
  render(<AdapterSwitches target={target} />);
  return target;
};

const matterBox = () => screen.getByRole('checkbox', { name: 'Matter' }) as HTMLInputElement;

describe('AdapterSwitches', () => {
  it('shows a switch for every adapter of the registry and nothing when the registry is empty', () => {
    show([matter, { ...matter, id: 'homekit', title: { en: 'HomeKit' } }]);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('shows nothing, not even the no apps warning, when no adapter is installed', () => {
    show([]);

    expect(screen.queryByText('configurator.labels.show-in-apps')).toBeNull();
    expect(screen.queryByText('configurator.labels.no-apps')).toBeNull();
  });

  it('takes the default of the adapter for a device without its key and writes the key once switched', () => {
    const target = show([{ ...matter, default: true }], device({ adapterSettings: { alice: true } }));
    expect(matterBox().checked).toBe(true);

    fireEvent.click(matterBox());

    expect(target.adapterSettings).toEqual({ alice: true, matter: false });
  });

  it('treats a device without the key as off when the adapter declares no default', () => {
    show([matter], device({ adapterSettings: {} }));

    expect(matterBox().checked).toBe(false);
  });

  it('keeps the switch enabled and warns with a link when the adapter service is stopped', () => {
    show([{ ...matter, active: false }]);

    expect(matterBox().disabled).toBe(false);
    expect(screen.getByText('configurator.labels.adapter-stopped', { exact: false })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'configurator.labels.adapter-page' }).getAttribute('href'))
      .toBe('/integrations/matter');
  });

  it('warns that the device goes nowhere when the only adapter of the registry is off', () => {
    show([matter], device({ adapterSettings: { matter: false } }));

    expect(screen.getByText('configurator.labels.no-apps')).toBeTruthy();
  });
});
