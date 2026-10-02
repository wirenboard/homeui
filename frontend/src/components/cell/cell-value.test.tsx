// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import Cell from '@/stores/devices/cell';
import { CellFormat } from '@/stores/devices/cell-type';
import { CellValue } from './cell-value';

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));

const makeCell = (type: string, value: string) => {
  const cell = new Cell('device1/ctrl', vi.fn());
  cell.setType(type as any);
  cell.receiveValue(value);
  return cell;
};

describe('CellValue display of integers a number cannot hold exactly', () => {
  test('a w1-id above 2^53 exactly held by a number is shown in 1-Wire format', () => {
    render(<CellValue cell={makeCell(CellFormat.OneWireId, '11539835611452932')} hideHistory hideCopy />);
    expect(screen.getByText('04-28ff6b5a6316')).toBeInTheDocument();
  });

  test('a w1-id the number would round is shown exactly', () => {
    // 0x80000000000001
    render(<CellValue cell={makeCell(CellFormat.OneWireId, '36028797018963969')} hideHistory hideCopy />);
    expect(screen.getByText('01-800000000000')).toBeInTheDocument();
  });

  test('a read-only value the number would round is shown with all digits', () => {
    render(<CellValue cell={makeCell('value', '-36028797018963969')} hideHistory hideCopy />);
    expect(screen.getByText('-36028797018963969')).toBeInTheDocument();
  });

  test('a writable value the number would round is put into the input with all digits', () => {
    const cell = makeCell('value', '36028797018963969');
    cell.setReadOnly(false);
    render(<CellValue cell={cell} hideHistory hideCopy />);
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('36028797018963969');
  });
});
