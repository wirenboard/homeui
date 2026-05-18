import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  offset,
  shift, useClick,
  useDismiss,
  useFloating, useInteractions,
  useRole,
} from '@floating-ui/react';
import classNames from 'classnames';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/tooltip';
import { focusToMainContent } from '@/utils/focus-content';
import type { MenuItemProps } from './types';
import './styles.css';

export const MenuItem = ({
  item,
  page,
  id,
  openedSubmenus,
  isMenuCompact,
  setOpenedSubmenus,
  activePopup,
  closeMobileMenu,
  setActivePopup,
  isMenuFocused,
  setIsMenuFocused,
}: MenuItemProps) => {
  const { t } = useTranslation();
  const Component = item.url ? 'a' : 'button';

  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    placement: 'right-start',
    middleware: [
      offset(8),
      flip(),
      shift(),
      arrow({
        element: arrowRef,
        padding: 8,
      }),
    ],
    open: activePopup === item.id,
    onOpenChange: (open) => setActivePopup(open ? item.id : null),
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const role = useRole(context);
  const click = useClick(context, { enabled: isMenuCompact });

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const renderPopupMenu = (children) => (
    <ul className="menuItem-popupList">
      <FloatingArrow ref={arrowRef} context={context} fill="currentColor" />

      {children.map((item, i) => (
        <li className="menuItem-item" key={i}>
          <a
            href={`#!/${item.url}`}
            className="menuItem-link"
            draggable={false}
          >
            {t(item.label)}
          </a>
        </li>
      ))}
    </ul>
  );

  const isOpened = useMemo(() => {
    return !!item.children?.length && !isMenuCompact && openedSubmenus.includes(item.id);
  }, [item.children, isMenuCompact, openedSubmenus]);

  const isActive = useMemo(() => {
    return (id ? item.url === `${page}/${id}` : item.url === page) ||
      (isMenuCompact &&
        item.children?.some((subItem) =>
          (id ? subItem.url === `${page}/${id}` : subItem.url === page) ||
            openedSubmenus.includes(subItem.id)
        ));
  }, [id, item, isMenuCompact]);

  return (item.isShow === undefined || item.isShow) && (
    <li>
      <Tooltip
        trigger={isMenuCompact && !activePopup ? 'hover' : null}
        text={t(item.label)}
        placement="right"
        className="navigation-tooltip"
        closeOnClick
      >
        <Component
          href={item.url && `#!/${item.url}`}
          aria-label={t(item.label)}
          className={classNames('menuItem-link', {
            'menuItem-linkActive': isActive,
            'menuItem-linkWithSubmenu': !!item.children?.length,
          })}
          tabIndex={isMenuFocused || isActive ? null : -1}
          draggable={false}
          ref={refs.setReference}
          onClick={() => {
            if (!isMenuCompact) {
              const updatedValue = openedSubmenus.includes(item.id)
                ? openedSubmenus.filter((menuItem) => menuItem !== item.id)
                : [...openedSubmenus, item.id];
              setOpenedSubmenus(updatedValue);
            }

            if (Component === 'a') {
              closeMobileMenu();
              // TODO: move to Page onMounted after full rewrite
              focusToMainContent(300);
            }
          }}
          onFocus={() => setIsMenuFocused(true)}
          onBlur={() => setIsMenuFocused(false)}
          {...(isMenuCompact ? getReferenceProps() : {})}
          aria-expanded={item.children?.length ? isOpened : null}
        >
          {item?.icon && (
            <item.icon className="menuItem-icon" />
          )}

          {!isMenuCompact && t(item.label)}

          {!!item.children?.length && activePopup === item.id && (
            <>
              <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="menuItem-popup"
              >
                {renderPopupMenu(item.children)}
              </div>
            </>
          )}
        </Component>
      </Tooltip>

      {isOpened && (
        <ul className={classNames('navigation-list', 'menuItem-subList')}>
          {item.children.map((item, i) => (
            <MenuItem
              id={id}
              page={page}
              item={item}
              isMenuCompact={isMenuCompact}
              openedSubmenus={openedSubmenus}
              setOpenedSubmenus={setOpenedSubmenus}
              activePopup={activePopup}
              setActivePopup={setActivePopup}
              closeMobileMenu={closeMobileMenu}
              isMenuFocused={isMenuFocused}
              setIsMenuFocused={setIsMenuFocused}
              key={i}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
