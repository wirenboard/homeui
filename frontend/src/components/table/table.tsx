import classNames from 'classnames';
import { Children, cloneElement, isValidElement, type PropsWithChildren, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  tabIndex,
  ...rest
}: PropsWithChildren<TableRowProps>) => {
  let isFirstWithUrl = true;
  const enhancedChildren = Children.map(children, (child) => {
    if (isValidElement(child)) {
      const shouldPassUrl = !(child.props as TableCellProps)?.isDraggable && url;
      const isFirstLinkColumn = shouldPassUrl && isFirstWithUrl;
      if (shouldPassUrl) {
        isFirstWithUrl = false;
      }
      return cloneElement(child, {
        url: shouldPassUrl ? url : null,
        ariaLabel: !!url && rest['aria-label'],
        isFirstLinkColumn,
        isHeading,
      } as Partial<typeof child.props>);
    }
  });

  return (
    <tr
      className={classNames('wb-tableRow', className, {
        'wb-tableRowHeading': isHeading,
        'wb-tableRowStickyHeading': isHeading && isSticky,
      })}
      {...rest}
      tabIndex={typeof tabIndex === 'number' ? tabIndex : (rest['onClick'] ? 0 : null)}
      role={rest['onClick'] ? 'button' : null}
      onKeyDown={(ev: any) => {
        if (rest['onClick'] && (ev.key === 'Enter' || ev.key === ' ')) {
          ev.preventDefault();
          rest['onClick'](ev);
        }
      }}
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
  align,
  verticalAlign = 'center',
  sort,
  width,
  url,
  ariaLabel,
  isFirstLinkColumn,
  isHeading,
  // eslint-disable-next-line no-unused-vars
  isDraggable,
  ...rest
}: PropsWithChildren<TableCellProps>) => {
  const { t } = useTranslation();

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
    <>
      <Button
        className={classNames('wb-tableCellSortButton', {
          'wb-tableCellSortButtonActive': sort.isActive,
        })}
        variant="unaccented"
        size="small"
        icon={
          sort.direction === 'asc' || !sort.isActive
            ? <SortAscIcon className="wb-tableCellSortIcon"/>
            : <SortDescIcon className="wb-tableCellSortIcon"/>
        }
        aria-label={t('common.buttons.sort', { column: sort.label })}
        aria-describedby="sort-direction-type"
        isOutlined
        onClick={sort.onSort}
      />
      {sort.isActive && (
        <span id="sort-direction-type" className="sr-only">
          {sort.direction === 'asc' ? t('common.labels.asc') : t('common.labels.desc')}
        </span>
      )}
    </>
  );

  const Component = isHeading ? 'th' : 'td';

  return (
    <Component
      style={width ? ({ width: width }) : null}
      className={classNames('wb-tableCell', className, {
        'wb-tableCellEllipsis': ellipsis,
        'wb-tableCellWithoutPadding': isWithoutPadding,
        'wb-tableCellVerticalAlignCenter': verticalAlign === 'center',
        'wb-tableCellAlignCenter': align === 'center',
        'wb-tableCellAlignRight': align === 'right',
        'wb-tableCellWithLink': !!url,
      })}
      aria-sort={sort?.isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={(ev) => {
        if (preventClick) {
          ev.preventDefault();
        }
      }}
      {...rest}
    >
      {!!url && !preventClick && (
        <a
          href={url}
          className="wb-tableLink"
          {...(isFirstLinkColumn ? {} : { 'aria-hidden': true, tabIndex: -1 })}
          aria-label={ariaLabel}
        />
      )}

      {sort ? (
        <div className={headerClass}>
          {content}
          {sortButton}
        </div>
      ) : (
        content
      )}
    </Component>
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
