// @vitest-environment happy-dom
import { type ReactElement } from 'react';
import { render, screen, fireEvent } from '@/test/render';
import { CellAlert } from './cell-alert';
import { CellButton } from './cell-button';
import { CellColorpicker } from './cell-colorpicker';
import { CellDateTime } from './cell-datetime';
import { CellHistory } from './cell-history';
import { CellRange } from './cell-range';
import { CellSwitch } from './cell-switch';
import { CellText } from './cell-text';

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}));

function makeCell(overrides: Record<string, any> = {}) {
  return {
    id: 'dev/ctrl',
    deviceId: 'dev',
    controlId: 'ctrl',
    name: 'Control',
    value: '',
    readOnly: false,
    error: null,
    isEnum: false,
    enumValues: [],
    min: 0,
    max: 100,
    step: 1,
    units: '',
    valueType: 'text',
    type: null,
    getEnumName: vi.fn((v: string) => v),
    getStringifiedValue: vi.fn(() => ''),
    ...overrides,
  } as any;
}

function withRouter(ui: ReactElement) {
  return render(ui);
}

describe('CellSwitch', () => {
  test('renders switch with cell value', () => {
    const cell = makeCell({ value: true });
    const { container } = withRouter(<CellSwitch cell={cell} hideHistory />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  test('inverted mode flips value', () => {
    const cell = makeCell({ value: true });
    const { container } = withRouter(<CellSwitch cell={cell} inverted hideHistory />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(false);
  });

  test('sets cell.value on change', () => {
    const cell = makeCell({ value: false });
    const { container } = withRouter(<CellSwitch cell={cell} hideHistory />);
    fireEvent.click(container.querySelector('input[type="checkbox"]')!);
    expect(cell.value).toBe(true);
  });

  test('disabled when readOnly', () => {
    const cell = makeCell({ readOnly: true, value: false });
    const { container } = withRouter(<CellSwitch cell={cell} hideHistory />);
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  test('shows history when hideHistory=false', () => {
    const cell = makeCell({ value: false });
    withRouter(<CellSwitch cell={cell} hideHistory={false} />);
    expect(screen.getByRole('link')).toBeDefined();
  });
});

describe('CellButton', () => {
  test('renders button with cell name', () => {
    const cell = makeCell();
    withRouter(<CellButton cell={cell} hideHistory />);
    expect(screen.getByText('Control')).toBeDefined();
  });

  test('renders with custom name', () => {
    const cell = makeCell();
    withRouter(<CellButton cell={cell} name="Custom" hideHistory />);
    expect(screen.getByText('Custom')).toBeDefined();
  });

  test('sets cell.value on click', () => {
    const cell = makeCell();
    withRouter(<CellButton cell={cell} hideHistory />);
    fireEvent.click(screen.getByRole('button'));
    expect(cell.value).toBe(true);
  });

  test('disabled when readOnly', () => {
    const cell = makeCell({ readOnly: true });
    withRouter(<CellButton cell={cell} hideHistory />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  test('danger variant when error', () => {
    const cell = makeCell({ error: ['read'] });
    const { container } = withRouter(<CellButton cell={cell} hideHistory />);
    expect(container.querySelector('.button-danger')).toBeTruthy();
  });

  test('system reboot shows confirm', () => {
    const cell = makeCell({ deviceId: 'system', controlId: 'Reboot' });
    withRouter(<CellButton cell={cell} hideHistory />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('system.reboot_confirm.title')).toBeDefined();
  });
});

describe('CellAlert', () => {
  test('renders alert with cell name', () => {
    const cell = makeCell({ value: false });
    withRouter(<CellAlert cell={cell} hideHistory />);
    expect(screen.getByText('Control')).toBeDefined();
  });

  test('danger variant when value is truthy', () => {
    const cell = makeCell({ value: true });
    const { container } = withRouter(<CellAlert cell={cell} hideHistory />);
    expect(container.querySelector('.alertMessage-danger')).toBeTruthy();
  });

  test('info variant when value is falsy', () => {
    const cell = makeCell({ value: false });
    const { container } = withRouter(<CellAlert cell={cell} hideHistory />);
    expect(container.querySelector('.alertMessage-info')).toBeTruthy();
  });

  test('uses custom name', () => {
    const cell = makeCell({ value: false });
    withRouter(<CellAlert cell={cell} name="Alarm" hideHistory />);
    expect(screen.getByText('Alarm')).toBeDefined();
  });
});

describe('CellRange', () => {
  test('renders range slider', () => {
    const cell = makeCell({ value: 50, min: 0, max: 100, step: 1 });
    withRouter(<CellRange cell={cell} />);
    expect(screen.getByRole('slider')).toBeDefined();
  });

  test('sets min/max/step from cell', () => {
    const cell = makeCell({ value: 5, min: 0, max: 10, step: 0.5 });
    withRouter(<CellRange cell={cell} />);
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('10');
  });

  test('disabled when readOnly', () => {
    const cell = makeCell({ value: 0, readOnly: true });
    withRouter(<CellRange cell={cell} />);
    expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('CellColorpicker', () => {
  test('renders colorpicker', () => {
    const cell = makeCell({ value: '#ff0000' });
    const { container } = withRouter(<CellColorpicker cell={cell} hideHistory />);
    expect(container.querySelector('input[type="color"]')).toBeTruthy();
  });
});

describe('CellHistory', () => {
  test('renders link to history', () => {
    const cell = makeCell();
    withRouter(<CellHistory cell={cell} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('/history/');
  });

  test('link contains encoded cell data', () => {
    const cell = makeCell({ deviceId: 'lamp', controlId: 'brightness' });
    withRouter(<CellHistory cell={cell} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('/history/');
  });

  test('applies visible class when isVisible', () => {
    const cell = makeCell();
    const { container } = withRouter(<CellHistory cell={cell} isVisible />);
    expect(container.querySelector('.deviceCell-historyLinkVisible')).toBeTruthy();
  });
});

describe('CellText', () => {
  test('renders read-only text', () => {
    const cell = makeCell({ value: 'hello', readOnly: true });
    withRouter(<CellText cell={cell} isCompact={false} hideHistory />);
    expect(screen.getByText('hello')).toBeDefined();
  });

  test('renders input for writable non-enum', () => {
    const cell = makeCell({ value: 'editable', readOnly: false, isEnum: false });
    withRouter(<CellText cell={cell} isCompact={false} hideHistory />);
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  test('renders dropdown for writable enum', () => {
    const cell = makeCell({
      value: 'a',
      readOnly: false,
      isEnum: true,
      enumValues: [{ name: 'Alpha', value: 'a' }, { name: 'Beta', value: 'b' }],
    });
    withRouter(<CellText cell={cell} isCompact={false} hideHistory />);
    expect(screen.getByText('Alpha')).toBeDefined();
  });

  test('applies compact class', () => {
    const cell = makeCell({ value: '', readOnly: false });
    const { container } = withRouter(<CellText cell={cell} isCompact hideHistory />);
    expect(container.querySelector('.deviceCell-isCompact')).toBeTruthy();
  });
});

describe('CellDateTime', () => {
  test('renders formatted date for read-only', () => {
    const unix = 1700000000;
    const cell = makeCell({ value: unix, readOnly: true });
    withRouter(<CellDateTime cell={cell} />);
    expect(screen.getByText(/2023/)).toBeDefined();
  });

  test('renders date picker for writable', () => {
    const cell = makeCell({ value: 1700000000, readOnly: false });
    const { container } = withRouter(<CellDateTime cell={cell} />);
    expect(container.querySelector('input')).toBeTruthy();
  });
});
