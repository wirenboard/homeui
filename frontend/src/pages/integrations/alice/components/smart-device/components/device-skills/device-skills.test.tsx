// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { DeviceSkills } from './device-skills';

vi.mock('./device-capabilities', () => ({
  DeviceCapabilities: (props: any) => (
    <div data-testid="device-capabilities" data-count={props.capabilities?.length} />
  ),
}));
vi.mock('./device-properties', () => ({
  DeviceProperties: (props: any) => (
    <div data-testid="device-properties" data-count={props.properties?.length} />
  ),
}));

describe('DeviceSkills', () => {
  const defaultProps = {
    capabilities: [{ type: 'cap1', mqtt: '/a', parameters: {} }] as any[],
    properties: [{ type: 'prop1', mqtt: '/b', parameters: {} }] as any[],
    onCapabilityChange: vi.fn(),
    onPropertyChange: vi.fn(),
  };

  test('renders DeviceCapabilities and DeviceProperties', () => {
    render(<DeviceSkills {...defaultProps} />);
    expect(screen.getByTestId('device-capabilities')).toBeDefined();
    expect(screen.getByTestId('device-properties')).toBeDefined();
  });

  test('passes capabilities count', () => {
    render(<DeviceSkills {...defaultProps} />);
    expect(screen.getByTestId('device-capabilities').dataset.count).toBe('1');
    expect(screen.getByTestId('device-properties').dataset.count).toBe('1');
  });

  test('renders with empty arrays', () => {
    render(
      <DeviceSkills
        capabilities={[]}
        properties={[]}
        onCapabilityChange={vi.fn()}
        onPropertyChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('device-capabilities').dataset.count).toBe('0');
  });
});
