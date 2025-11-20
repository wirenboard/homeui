import classNames from 'classnames';
import { Children, cloneElement, isValidElement, type PropsWithChildren, useMemo } from 'react';
import { Loader } from '@/components/loader';
import type { TableProps, TableCellProps, TableRowProps } from './types';
import './styles.css';

export const TableRow = ({
  children,
  className,
  gap,
  url,
  isFullWidth,
  isHeading,
  ...rest
}: PropsWithChildren<TableRowProps>) => {
  const Component = url ? 'a' : 'div';

  const gridTemplateColumns = useMemo(() => {
    const cols: string[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child)) {
        const val = child.props.width
          ? `${child.props.width}px`
          : isFullWidth
            ? '1fr'
            : 'minmax(100px, 1fr)';
        cols.push(val);
      }
    });
    return cols.join(' ');
  }, [children, isFullWidth]);

  return (
    <Component
      role="row"
      className={classNames('wb-tableRow', className, {
        'wb-tableRowHeading': isHeading,
      })}
      style={{ gridTemplateColumns, gap: gap ? `${gap}px` : undefined }}
      {...(url ? { href: url } : {})}
      {...rest}
    >
      {children}
    </Component>
  );
};

export const TableCell = ({
  children,
  className,
  preventClick,
  visibleOnHover,
  ellipsis,
  isWithoutPadding,
  align,
  verticalAlign = 'center',
  ...rest
}: PropsWithChildren<TableCellProps>) => (
  <div
    role="gridcell"
    className={classNames('wb-tableCell', className, {
      'wb-tableCellEllipsis': ellipsis,
      'wb-tableCellWithoutPadding': isWithoutPadding,
      'wb-tableCellVerticalAlignCenter': verticalAlign === 'center',
      'wb-tableCellAlignCenter': align === 'center',
      'wb-tableCellAlignRight': align === 'right',
    })}
    onClick={(ev) => {
      if (preventClick) {
        ev.preventDefault();
      }
    }}
    {...rest}
  >
    <span
      className={classNames({
        'wb-tableCellInvisible': visibleOnHover,
      })}
    >
      {children}
    </span>
  </div>
);

export const Table = ({
  children, className, isLoading, isFullWidth, isWithoutGap, ...rest
}: PropsWithChildren<TableProps>) => {

  const enhancedChildren = Children.map(children, (child) => {
    if (isValidElement(child)) {
      return cloneElement(child, { isFullWidth } as Partial<typeof child.props>);
    }
    return child;
  });

  return (
    (
      <div className={classNames('wb-tableWrapper', className)} {...rest}>
        <div
          role="grid"
          className={classNames('wb-table', {
            'wb-tableFullWidth': isFullWidth,
            'wb-tableWithoutGap': isWithoutGap,
          })}
        >
          {enhancedChildren}
          {isLoading && (
            <div className="wb-tableLoading">
              <Loader className="page-loader" />
            </div>
          )}
        </div>
      </div>
    )
  );
};
