// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { DescriptionStatus } from './description-status';

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('react-responsive', () => ({
  useMediaQuery: () => true,
}));

describe('DescriptionStatus', () => {
  test('shows connected text when not compact', () => {
    render(<DescriptionStatus isConnected={true} isCompact={false} description="" />);
    expect(screen.getByText('navigation.connection.active')).toBeDefined();
  });

  test('shows disconnected text when not compact', () => {
    render(<DescriptionStatus isConnected={false} isCompact={false} description="" />);
    expect(screen.getByText('navigation.connection.inactive')).toBeDefined();
  });

  test('shows description when provided', () => {
    render(<DescriptionStatus isConnected={true} isCompact={false} description="v1.2.3" />);
    expect(screen.getByText('v1.2.3')).toBeDefined();
  });

  test('connected badge class in compact mode', () => {
    const { container } = render(<DescriptionStatus isConnected={true} isCompact={true} description="" />);
    expect(container.querySelector('.descriptionStatus-statusConnectedBadge')).toBeTruthy();
  });

  test('disconnected badge class in compact mode', () => {
    const { container } = render(<DescriptionStatus isConnected={false} isCompact={true} description="" />);
    expect(container.querySelector('.descriptionStatus-statusDisconnectedBadge')).toBeTruthy();
  });

  test('connected class when not compact and no description', () => {
    const { container } = render(<DescriptionStatus isConnected={true} isCompact={false} description="" />);
    expect(container.querySelector('.descriptionStatus-statusConnected')).toBeTruthy();
  });
});
