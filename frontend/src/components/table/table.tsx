import classNames from 'classnames';
import { Children, cloneElement, isValidElement, type PropsWithChildren, type ReactNode } from 'react';
import SortAscIcon from '@/assets/icons/sort-asc.svg';
import SortDescIcon from '@/assets/icons/sort-desc.svg';
import { Button } from '@/components/button';
import { Loader } from '@/components/loader';
import type { TableCellProps, TableProps, TableRowProps } from './types';
import './styles.css';

export const TableRow = ({
  children,
  className,
  url,
  isHeading,
  isSticky,
  ...rest
}: PropsWithChildren<TableRowProps>) => {
  const enhancedChildren = Children.map(children, (child) => {
    if (isValidElement(child)) {
      return cloneElement(child, { url } as Partial<typeof child.props>);
    }
  });

  return (
    <tr
      className={classNames('wb-tableRow', className, {
        'wb-tableRowHeading': isHeading,
        'wb-tableRowStickyHeading': isHeading && isSticky,
      })}
      {...rest}
    >
      {enhancedChildren}
    </tr>
  );
};

export const TableCell = ({
  children,
  className,
  preventClick,
  visibleOnHover,
  ellipsis,
  isWithoutPadding,
  isDraggable,
  align,
  verticalAlign = 'center',
  sort,
  width,
  url,
  ...rest
}: PropsWithChildren<TableCellProps>) => {
  const content = (
    <span
      className={classNames({
        'wb-tableCellInvisible': visibleOnHover,
      })}
    >
      {children}
    </span>
  );

  const headerClass = classNames('wb-tableCellHeader', {
    'wb-tableCellHeaderRight': align === 'right',
    'wb-tableCellHeaderCenter': align === 'center',
  });

  const sortButton = sort && (
    <Button
      className={classNames('wb-tableCellSortButton', {
        'wb-tableCellSortButtonActive': sort.isActive,
      })}
      variant="unaccented"
      size="small"
      icon={
        sort.direction === 'asc' || !sort.isActive
          ? <SortAscIcon className="wb-tableCellSortIcon" />
          : <SortDescIcon className="wb-tableCellSortIcon" />
      }
      isOutlined
      onClick={sort.onSort}
    />
  );

  return (
    <td
      style={width ? ({ width: width }) : null}
      className={classNames('wb-tableCell', className, {
        'wb-tableCellEllipsis': ellipsis,
        'wb-tableCellWithoutPadding': isWithoutPadding,
        'wb-tableCellVerticalAlignCenter': verticalAlign === 'center',
        'wb-tableCellAlignCenter': align === 'center',
        'wb-tableCellAlignRight': align === 'right',
        'wb-tableCellWithLink': !!url,
      })}
      onClick={(ev) => {
        if (preventClick) {
          ev.preventDefault();
        }
      }}
      {...rest}
    >
      {!!url && !isDraggable && <a href={url} className="wb-tableLink" />}

      {sort ? (
        <div className={headerClass}>
          {content}
          {sortButton}
        </div>
      ) : (
        content
      )}
    </td>
  );
};

export const Table = ({
  children, className, isLoading, isFullWidth, isWithoutGap, ...rest
}: PropsWithChildren<TableProps>) => {

  const headingRows: ReactNode[] = [];
  const bodyRows: ReactNode[] = [];
  const inBodyRows: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }
    if ((child.props as TableRowProps).isHeading) {
      headingRows.push(child);
    } else if ((child.props as any).tag === 'tbody') {
      inBodyRows.push(child);
    } else {
      bodyRows.push(child);
    }
  });

  return (
    (
      <div className={classNames('wb-tableWrapper', className)} {...rest}>
        <table
          className={classNames('wb-table', {
            'wb-tableFullWidth': isFullWidth,
            'wb-tableWithoutGap': isWithoutGap,
          })}
        >
          {!!headingRows.length && (
            <thead>
              {headingRows}
            </thead>
          )}
          {!!bodyRows.length && (
            <tbody className="wb-tableBody">
              {bodyRows}
            </tbody>
          )}
          {inBodyRows}
          {isLoading && (
            <tfoot className="wb-tableLoading">
              <Loader className="page-loader" />
            </tfoot>
          )}
        </table>
      </div>
    )
  );
};
