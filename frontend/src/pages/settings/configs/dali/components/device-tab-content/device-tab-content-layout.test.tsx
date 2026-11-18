// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { runInAction } from 'mobx';
import { MAX_LAPTOP_WIDTH, MAX_MOBILE_WIDTH, MIN_DESKTOP_WIDTH, MIN_TABLET_WIDTH } from '@/common/breakpoints';
import { DeviceStore } from '@/stores/dali/device-store';
import { DeviceTabContent } from './device-tab-content';

const viewport = vi.hoisted(() => ({ width: 0 }));

vi.mock('react-responsive', () => ({
  useMediaQuery: ({ maxWidth }: { maxWidth: number }) => viewport.width <= maxWidth,
}));
vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));
vi.mock('@/components/json-schema-editor', () => ({
  JsonSchemaEditor: () => <div data-testid="json-schema-editor" />,
}));

const renderDevice = (width: number) => {
  viewport.width = width;
  const store = new DeviceStore('dev1', 'Lamp');
  runInAction(() => {
    store.description = { brand_name: 'Skydance', product_name: 'DA5-L', types: [6, 8], gtin: 6975617411324 };
  });
  return render(<DeviceTabContent store={store} />);
};

const headerButtons = ['dali.buttons.identify', 'dali.buttons.reset', 'dali.buttons.reload', 'common.buttons.save'];

describe('DeviceTabContent layout', () => {
  test('shows the full info panel and no info row on a phone', () => {
    renderDevice(MAX_MOBILE_WIDTH);

    expect(screen.getByText('6975617411324')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'dali.labels.info-device' })).toBeNull();
  });

  test('shows the compact info row instead of the panel from tablet width', () => {
    renderDevice(MIN_TABLET_WIDTH);

    expect(screen.getByText('DT6, DT8')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'dali.labels.info-device' })).toBeTruthy();
    expect(screen.queryByText('6975617411324')).toBeNull();
  });

  test.each([MIN_TABLET_WIDTH, MAX_LAPTOP_WIDTH])('shows icon buttons with accessible names at %ipx', (width) => {
    renderDevice(width);

    for (const name of headerButtons) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
      expect(screen.queryByText(name)).toBeNull();
    }
  });

  test('shows text buttons from desktop width', () => {
    renderDevice(MIN_DESKTOP_WIDTH);

    for (const name of headerButtons) {
      expect(screen.getByText(name).closest('button')).toBeTruthy();
    }
  });
});
