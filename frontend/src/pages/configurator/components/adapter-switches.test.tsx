// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore, type Adapter, type Device } from '@/stores/configurator';
import { render, screen } from '@/test/render';
import { AdapterSwitches } from './adapter-switches';

const matter: Adapter = {
  id: 'matter',
  title: { ru: 'Matter', en: 'Matter' },
  package: 'wb-mqtt-matter-bridge',
  url: 'integrations/matter',
  installed: true,
  active: true,
};
const alice: Adapter = {
  id: 'alice', title: { ru: 'Яндекс Алиса', en: 'Yandex Alice' }, languages: ['ru'], installed: true, active: true,
};

const device = (fields: Partial<Device> = {}): Device =>
  ({ id: 'd', name: 'd', matter: true, alice: true, rows: [], ...fields });

const show = (adapters: Adapter[], target = device()) => {
  runInAction(() => {
    configuratorStore.adapters = adapters;
  });
  render(<AdapterSwitches target={target} />);
};

describe('AdapterSwitches', () => {
  it('hides an adapter that is not available in the interface language (tests run in English)', () => {
    show([matter, alice]);

    expect(screen.getByRole('checkbox', { name: 'Matter' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Yandex Alice' })).toBeNull();
  });

  it('skips registry entries the device model has no switch for', () => {
    show([matter, { ...matter, id: 'homekit', title: { en: 'HomeKit' } }]);

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('disables the switch of a not installed adapter that is off and names the package', () => {
    show([{ ...matter, installed: false, active: false }], device({ matter: false }));

    expect((screen.getByRole('checkbox', { name: 'Matter' }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('configurator.labels.adapter-not-installed')).toBeTruthy();
  });

  it('lets the user switch off a not installed adapter that is still on in the config', () => {
    show([{ ...matter, installed: false, active: false }]);

    expect((screen.getByRole('checkbox', { name: 'Matter' }) as HTMLInputElement).disabled).toBe(false);
  });

  it('keeps the switch enabled and warns with a link when the adapter service is stopped', () => {
    show([{ ...matter, active: false }]);

    expect((screen.getByRole('checkbox', { name: 'Matter' }) as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByText('configurator.labels.adapter-stopped', { exact: false })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'configurator.labels.adapter-page' }).getAttribute('href'))
      .toBe('/integrations/matter');
  });
});
