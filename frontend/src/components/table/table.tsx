import classNames from 'classnames';
import { PropsWithChildren } from 'react';
import { Loader } from '@/components/loader';
import { TableProps, TableCellProps, TableRowProps } from './types';
import './styles.css';

export const TableRow = ({ children, url }: PropsWithChildren<TableRowProps>) => {
  const Component = url ? 'a' : 'div';
  return (
    <Component role="row" className="wb-tableRow" {...(url ? { href: url } : {})}>
      {children}
    </Component>
  );
};

export const TableCell = ({
  children, fitContent, preventClick, visibleOnHover,
}: PropsWithChildren<TableCellProps>) => (
  <div
    role="gridcell"
    className={classNames('wb-tableCell', {
      'wb-tableCellFitContent': fitContent,
    })}
    onClick={(ev) => {
      if (preventClick) {
        ev.preventDefault();
      }
    }}
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
  children, isLoading, isFullWidth,
}: PropsWithChildren<TableProps>) => (
  <div className="wb-tableWrapper">
    <div
      role="grid"
      className={classNames('wb-table', {
        'wb-tableFullWidth': isFullWidth,
      })}
    >
      {children}
      {isLoading && (
        <div className="wb-tableLoading">
          <Loader className="page-loader" />
        </div>
      )}
    </div>
  </div>
);
