// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { DeviceInfoPanel } from './device-info-panel';

const description = {
  brand_name: 'Skydance',
  product_name: 'DA5-L',
  gtin: 6975617411324,
};

describe('DeviceInfoPanel', () => {
  test('shows the picture only after it has loaded', () => {
    render(<DeviceInfoPanel description={description} />);
    const img = screen.getByAltText('Skydance DA5-L');

    expect(img.getAttribute('src')).toBe('/dali-images/6975617411324.webp');
    expect(img.closest('button').className).toContain('zoomableImage-loading');

    fireEvent.load(img);
    expect(img.closest('button').className).not.toContain('zoomableImage-loading');
  });

  test('keeps the text and drops the picture when it fails to load', () => {
    render(<DeviceInfoPanel description={description} />);
    fireEvent.error(screen.getByAltText('Skydance DA5-L'));

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Skydance')).toBeTruthy();
    expect(screen.getByText('6975617411324')).toBeTruthy();
  });

  test('does not request a picture without a GTIN', () => {
    render(<DeviceInfoPanel description={{ ...description, gtin: undefined }} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('DA5-L')).toBeTruthy();
  });

  test('takes the picture from oem_gtin when gtin is missing', () => {
    render(<DeviceInfoPanel description={{ ...description, gtin: undefined, oem_gtin: 196183149305 }} />);

    expect(screen.getByAltText('Skydance DA5-L').getAttribute('src')).toBe('/dali-images/196183149305.webp');
  });

  test('does not request a picture for a zero GTIN', () => {
    render(<DeviceInfoPanel description={{ ...description, gtin: 0 }} />);

    expect(screen.queryByRole('img')).toBeNull();
  });
});
