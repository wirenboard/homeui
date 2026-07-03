// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { CellComponent } from '@/stores/devices';
import { CellError } from '@/stores/devices/cell-type';
import { CellContent } from './cell';

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/cell/cell-text', () => ({
  CellText: () => <div data-testid="cell-text" />,
}));
vi.mock('@/components/cell/cell-alert', () => ({
  CellAlert: () => <div data-testid="cell-alert" />,
}));
vi.mock('@/components/cell/cell-switch', () => ({
  CellSwitch: () => <div data-testid="cell-switch" />,
}));
vi.mock('@/components/cell/cell-button', () => ({
  CellButton: () => <div data-testid="cell-button" />,
}));
vi.mock('@/components/cell/cell-range', () => ({
  CellRange: () => <div data-testid="cell-range" />,
}));
vi.mock('@/components/cell/cell-colorpicker', () => ({
  CellColorpicker: () => <div data-testid="cell-colorpicker" />,
}));
vi.mock('@/components/cell/cell-datetime', () => ({
  CellDateTime: () => <div data-testid="cell-datetime" />,
}));
vi.mock('@/components/cell/cell-value', () => ({
  CellValue: () => <div data-testid="cell-value" />,
}));
vi.mock('@/components/cell/cell-history', () => ({
  CellHistory: () => <div data-testid="cell-history" />,
}));
vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}));

function makeCell(displayType: CellComponent, overrides: Record<string, any> = {}) {
  return {
    id: 'device/ctrl',
    name: 'Control',
    displayType,
    error: null,
    ...overrides,
  } as any;
}

describe('CellContent', () => {
  test('renders CellText for Text type', () => {
    render(<CellContent cell={makeCell(CellComponent.Text)} />);
    expect(screen.getByTestId('cell-text')).toBeDefined();
  });

  test('renders CellAlert for Alert type', () => {
    render(<CellContent cell={makeCell(CellComponent.Alert)} />);
    expect(screen.getByTestId('cell-alert')).toBeDefined();
  });

  test('renders CellSwitch for Switch type', () => {
    render(<CellContent cell={makeCell(CellComponent.Switch)} />);
    expect(screen.getByTestId('cell-switch')).toBeDefined();
  });

  test('renders CellButton for Button type', () => {
    render(<CellContent cell={makeCell(CellComponent.Button)} />);
    expect(screen.getByTestId('cell-button')).toBeDefined();
  });

  test('renders CellRange for Range type', () => {
    render(<CellContent cell={makeCell(CellComponent.Range)} />);
    expect(screen.getByTestId('cell-range')).toBeDefined();
  });

  test('renders CellColorpicker for Colorpicker type', () => {
    render(<CellContent cell={makeCell(CellComponent.Colorpicker)} />);
    expect(screen.getByTestId('cell-colorpicker')).toBeDefined();
  });

  test('renders CellDateTime for DateTime type', () => {
    render(<CellContent cell={makeCell(CellComponent.DateTime)} />);
    expect(screen.getByTestId('cell-datetime')).toBeDefined();
  });

  test('renders CellValue for Value type', () => {
    render(<CellContent cell={makeCell(CellComponent.Value)} />);
    expect(screen.getByTestId('cell-value')).toBeDefined();
  });

  test('shows cell name when not compact', () => {
    render(<CellContent cell={makeCell(CellComponent.Text)} />);
    expect(screen.getByText('Control')).toBeDefined();
  });

  test('shows custom name over cell name', () => {
    render(<CellContent cell={makeCell(CellComponent.Text)} name="Custom" />);
    expect(screen.getByText('Custom')).toBeDefined();
  });

  test('hides name for Alert type', () => {
    render(<CellContent cell={makeCell(CellComponent.Alert)} />);
    expect(screen.queryByText('Control')).toBeNull();
  });

  test('hides name for Button type', () => {
    render(<CellContent cell={makeCell(CellComponent.Button)} />);
    expect(screen.queryByText('Control')).toBeNull();
  });

  test('applies error class for Read error', () => {
    const { container } = render(
      <CellContent cell={makeCell(CellComponent.Text, { error: [CellError.Read] })} />,
    );
    expect(container.querySelector('.deviceCell-error')).toBeTruthy();
  });

  test('applies period error class', () => {
    const { container } = render(
      <CellContent cell={makeCell(CellComponent.Text, { error: [CellError.Period] })} />,
    );
    expect(container.querySelector('.deviceCell-errorPeriod')).toBeTruthy();
  });

  test('applies reversed class in compact mode for non-alert types', () => {
    const { container } = render(
      <CellContent cell={makeCell(CellComponent.Text)} isCompact />,
    );
    expect(container.querySelector('.deviceCell-reversed')).toBeTruthy();
  });
});
