// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DeviceInfoCompact } from './device-info-compact';

const description = {
  brand_name: 'Skydance',
  product_name: 'DA5-L',
  types: [6, 8],
  gtin: 6975617411324,
  identification_number: 42,
  firmware_version: '1.2',
  hardware_version: '3',
  oem_gtin: 196183149305,
  oem_identification_number: 7,
};

const openDialog = () => fireEvent.click(screen.getByRole('button', { name: 'dali.labels.info-device' }));

const loadPicture = (width: number, height: number) => {
  const img = screen.getByAltText('Skydance DA5-L') as HTMLImageElement;
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
  return img;
};

describe('DeviceInfoCompact', () => {
  test('shows the brand, the product and the short types, without the picture and the fields', () => {
    render(<DeviceInfoCompact description={description} />);

    expect(screen.getByText('Skydance DA5-L')).toBeTruthy();
    expect(screen.getByText('DT6, DT8')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText('6975617411324')).toBeNull();
    expect(screen.queryByText('dali.labels.info-gtin')).toBeNull();
  });

  test('shows only the types and the info button without a brand and a product', () => {
    const { container } = render(
      <DeviceInfoCompact description={{ ...description, brand_name: undefined, product_name: undefined }} />,
    );

    expect(container.querySelector('.daliDeviceInfo-compactName')).toBeNull();
    expect(screen.getByText('DT6, DT8')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'dali.labels.info-device' })).toBeEnabled();
  });

  test('hides the info button when the dialog would have nothing to show', () => {
    render(<DeviceInfoCompact description={{ brand_name: 'Skydance', product_name: 'DA5-L' }} />);

    expect(screen.getByText('Skydance DA5-L')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'dali.labels.info-device' })).toBeNull();
  });

  test('shows the info button for a device with only the fields', () => {
    render(<DeviceInfoCompact description={{ firmware_version: '1.2' }} />);

    expect(screen.getByRole('button', { name: 'dali.labels.info-device' })).toBeEnabled();
  });

  test('opens a dialog with the decoded types and all the fields from the info button, closing removes it', () => {
    render(<DeviceInfoCompact description={description} />);
    openDialog();

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Skydance DA5-L');
    expect(dialog.textContent).toContain('dali.device-types.6, dali.device-types.8');
    for (const value of ['6975617411324', '42', '1.2', '3', '196183149305', '7']) {
      expect(screen.getByText(value)).toBeTruthy();
    }

    fireEvent.click(screen.getByLabelText('common.buttons.close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('titles the dialog generically without a brand and a product', () => {
    render(<DeviceInfoCompact description={{ ...description, brand_name: undefined, product_name: undefined }} />);
    openDialog();

    expect(screen.getByRole('heading').textContent).toBe('dali.labels.info-device');
  });

  test('puts a wide picture on top and a tall picture on the left', () => {
    const { unmount } = render(<DeviceInfoCompact description={description} />);
    openDialog();
    act(() => {
      loadPicture(960, 160);
    });
    expect(document.querySelector('.daliDeviceInfoDialog-top')).toBeTruthy();
    unmount();

    render(<DeviceInfoCompact description={description} />);
    openDialog();
    act(() => {
      loadPicture(320, 960);
    });
    expect(document.querySelector('.daliDeviceInfoDialog-left')).toBeTruthy();
  });

  test('does not open a second dialog on a click on the picture', () => {
    render(<DeviceInfoCompact description={description} />);
    openDialog();
    let img: HTMLImageElement;
    act(() => {
      img = loadPicture(960, 160);
    });
    fireEvent.click(img);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  test('keeps the text in the dialog when the picture fails to load', () => {
    render(<DeviceInfoCompact description={description} />);
    openDialog();
    fireEvent.error(screen.getByAltText('Skydance DA5-L'));

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('6975617411324')).toBeTruthy();
  });
});
