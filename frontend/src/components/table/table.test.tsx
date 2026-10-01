// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import { Table, TableRow, TableCell } from './table';

describe('Table', () => {
  test('renders table', () => {
    render(
      <Table>
        <TableRow><TableCell>Data</TableCell></TableRow>
      </Table>,
    );
    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByText('Data')).toBeDefined();
  });

  test('separates heading rows into thead', () => {
    const { container } = render(
      <Table>
        <TableRow isHeading><TableCell>Header</TableCell></TableRow>
        <TableRow><TableCell>Body</TableCell></TableRow>
      </Table>,
    );
    expect(container.querySelector('thead')).toBeTruthy();
    expect(container.querySelector('tbody')).toBeTruthy();
  });

  test('applies fullWidth class', () => {
    const { container } = render(
      <Table isFullWidth><TableRow><TableCell>X</TableCell></TableRow></Table>,
    );
    expect(container.querySelector('.wb-tableFullWidth')).toBeTruthy();
  });

  test('shows loader when isLoading', () => {
    const { container } = render(
      <Table isLoading><TableRow><TableCell>X</TableCell></TableRow></Table>,
    );
    expect(container.querySelector('tfoot')).toBeTruthy();
  });
});

describe('TableRow', () => {
  test('renders children', () => {
    render(
      <table><tbody><TableRow><TableCell>Cell</TableCell></TableRow></tbody></table>,
    );
    expect(screen.getByText('Cell')).toBeDefined();
  });

  test('onClick makes row clickable with role=button', () => {
    const onClick = vi.fn();
    render(
      <table><tbody><TableRow onClick={onClick}><TableCell>Click</TableCell></TableRow></tbody></table>,
    );
    const row = screen.getByRole('button');
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalled();
  });

  test('Enter triggers onClick', () => {
    const onClick = vi.fn();
    render(
      <table><tbody><TableRow onClick={onClick}><TableCell>KB</TableCell></TableRow></tbody></table>,
    );
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });

  test('applies heading class', () => {
    const { container } = render(
      <table><thead><TableRow isHeading><TableCell>H</TableCell></TableRow></thead></table>,
    );
    expect(container.querySelector('.wb-tableRowHeading')).toBeTruthy();
  });
});

describe('TableCell', () => {
  test('renders as td by default', () => {
    render(
      <table><tbody><tr><TableCell>Val</TableCell></tr></tbody></table>,
    );
    expect(screen.getByText('Val').closest('td')).toBeTruthy();
  });

  test('renders as th when isHeading', () => {
    render(
      <table><thead><tr><TableCell isHeading>Header</TableCell></tr></thead></table>,
    );
    expect(screen.getByText('Header').closest('th')).toBeTruthy();
  });

  test('renders link when url provided', () => {
    const { container } = render(
      <table><tbody><tr><TableCell url="/items/1">Linked</TableCell></tr></tbody></table>,
    );
    expect(container.querySelector('a.wb-tableLink')).toBeTruthy();
  });

  test('applies ellipsis class', () => {
    const { container } = render(
      <table><tbody><tr><TableCell ellipsis>Long text</TableCell></tr></tbody></table>,
    );
    expect(container.querySelector('.wb-tableCellEllipsis')).toBeTruthy();
  });

  test('applies alignment classes', () => {
    const { container } = render(
      <table><tbody><tr><TableCell align="right">R</TableCell></tr></tbody></table>,
    );
    expect(container.querySelector('.wb-tableCellAlignRight')).toBeTruthy();
  });

  test('applies custom width', () => {
    const { container } = render(
      <table><tbody><tr><TableCell width="200px">W</TableCell></tr></tbody></table>,
    );
    expect(container.querySelector('td')!.style.width).toBe('200px');
  });
});
