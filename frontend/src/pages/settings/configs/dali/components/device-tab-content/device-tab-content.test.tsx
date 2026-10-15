// @vitest-environment happy-dom
import { render, screen, act } from '@testing-library/react';
import { DeviceStore } from '@/stores/dali/device-store';
import { daliProxyMock } from '@/test/mocks/services';
import { DeviceTabContent } from './device-tab-content';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));
vi.mock('@/components/json-schema-editor', () => ({
  JsonSchemaEditor: () => <div data-testid="json-schema-editor" />,
}));

const button = (label: string) => screen.getByText(label).closest('button');

describe('DeviceTabContent', () => {
  // The store prop never changes identity, so the tab is only redrawn through MobX:
  // everything it reads has to be observable.
  test('replaces the loader with the editor when a load started after mount resolves', async () => {
    let resolveGetDevice: (data: any) => void;
    daliProxyMock.GetDevice.mockReturnValue(new Promise((resolve) => {
      resolveGetDevice = resolve;
    }));
    const store = new DeviceStore('dev1', 'Lamp');

    render(<DeviceTabContent store={store} />);
    expect(document.querySelector('.dali-contentLoader')).toBeTruthy();

    act(() => {
      store.load();
    });
    await act(async () => {
      resolveGetDevice({ config: {}, schema: {}, name: 'Lamp' });
    });

    expect(screen.getByTestId('json-schema-editor')).toBeTruthy();
    expect(document.querySelector('.dali-contentLoader')).toBeNull();
  });

  // The toolbar is always on screen, so its buttons are what keeps a second request
  // from being fired into a load that is still running.
  test('disables the toolbar while a load is in flight and enables it afterwards', async () => {
    let resolveGetDevice: (data: any) => void;
    daliProxyMock.GetDevice.mockReturnValue(new Promise((resolve) => {
      resolveGetDevice = resolve;
    }));
    const store = new DeviceStore('dev1', 'Lamp');

    render(<DeviceTabContent store={store} />);
    act(() => {
      store.load();
    });

    expect(button('dali.buttons.reload')).toBeDisabled();
    expect(button('dali.buttons.reset')).toBeDisabled();
    expect(button('common.buttons.save')).toBeDisabled();

    await act(async () => {
      resolveGetDevice({ config: {}, schema: {}, name: 'Lamp' });
    });

    expect(button('dali.buttons.reload')).toBeEnabled();
    expect(button('dali.buttons.reset')).toBeEnabled();
    expect(button('common.buttons.save')).toBeDisabled();
  });

  test('keeps the toolbar usable when the load fails, with save disabled', async () => {
    daliProxyMock.GetDevice.mockRejectedValue(new Error('no answer from the device'));
    const store = new DeviceStore('dev1', 'Lamp');

    render(<DeviceTabContent store={store} />);
    await act(async () => {
      await store.load();
    });

    expect(document.querySelector('.dali-contentLoader')).toBeNull();
    expect(screen.queryByTestId('json-schema-editor')).toBeNull();
    expect(store.error).toBeTruthy();
    expect(button('dali.buttons.reload')).toBeEnabled();
    expect(button('common.buttons.save')).toBeDisabled();
  });

  // Reset reads the settings the failed load never produced, so it has to cope with none.
  test('resets the settings of a device whose load failed', async () => {
    daliProxyMock.GetDevice.mockRejectedValue(new Error('no answer from the device'));
    daliProxyMock.ResetDeviceSettings.mockResolvedValue({});
    const store = new DeviceStore('dev1', 'Lamp');

    render(<DeviceTabContent store={store} />);
    await act(async () => {
      await store.load();
    });

    await act(async () => {
      button('dali.buttons.reset').click();
    });
    await act(async () => {
      button('dali.buttons.reset-confirm').click();
    });

    expect(daliProxyMock.ResetDeviceSettings).toHaveBeenCalledWith({ deviceId: 'dev1' });
    expect(button('dali.buttons.reload')).toBeTruthy();
  });
});
