// @vitest-environment happy-dom
import { render, screen } from '@/test/render';
import { CellText } from './cell-text';
import { CellValue } from './cell-value';

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));

const makeCell = (overrides: Record<string, any> = {}) => ({
  id: 'dev/ctrl',
  name: 'Control',
  value: 42,
  readOnly: false,
  error: null,
  isEnum: false,
  enumValues: [],
  min: 0,
  max: 100,
  step: 1,
  units: '',
  valueType: 'number',
  fractionDigits: 0,
  type: null,
  ...overrides,
}) as any;

describe('isDisabled', () => {
  test('keeps the number input of CellValue and blocks it', () => {
    render(<CellValue cell={makeCell()} isDisabled hideHistory hideCopy />);
    expect(screen.getByRole('spinbutton')).toBeDisabled();
  });

  test('keeps the text input of CellText and blocks it', () => {
    const cell = makeCell({ value: 'text', valueType: 'text' });
    render(<CellText cell={cell} isCompact={false} isDisabled hideHistory hideCopy />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
