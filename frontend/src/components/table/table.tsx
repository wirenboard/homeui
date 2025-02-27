import classNames from 'classnames';
import { Children, cloneElement, isValidElement, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { Loader } from '@/components/loader';
import { TableProps, TableCellProps, TableRowProps } from './types';
import './styles.css';

export const TableRow = ({ children, url, isFullWidth, ...rest }: PropsWithChildren<TableRowProps>) => {
  const Component = url ? 'a' : 'div';
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    Children.forEach(children, (child) => {
      if (isValidElement(child)) {
        setColumns((prev) => {
          const val = child.props.width ? child.props.width + 'px' : (isFullWidth ? '1fr' : 'minmax(100px, 1fr)');
          return [...prev, val];
        });
      }
    });
  }, []);

  const gridTemplateColumns = useMemo(() => {
    return columns.join(' ');
  }, [columns]);

  return (
    <Component
      role="row"
      className="wb-tableRow"
      style={{ gridTemplateColumns }}
      {...(url ? { href: url } : {})}
      {...rest}
    >
      {children}
    </Component>
  );
};

export const TableCell = ({
  children, preventClick, visibleOnHover, ellipsis, ...rest
}: PropsWithChildren<TableCellProps>) => (
  <div
    role="gridcell"
    className={classNames('wb-tableCell', {
      'wb-tableCellEllipsis': ellipsis,
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
  children, isLoading, isFullWidth, ...rest
}: PropsWithChildren<TableProps>) => {

  const enhancedChildren = Children.map(children, (child) => {
    if (isValidElement(child)) {
      return cloneElement(child, { isFullWidth } as Partial<typeof child.props>);
    }
    return child;
  });

  return (
    (
      <div className="wb-tableWrapper" {...rest}>
        <div
          role="grid"
          className={classNames('wb-table', {
            'wb-tableFullWidth': isFullWidth,
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
