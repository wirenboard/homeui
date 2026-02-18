import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import ConsoleIcon from '@/assets/icons/console.svg';
import LogoutIcon from '@/assets/icons/logout.svg';
import MenuIcon from '@/assets/icons/menu.svg';
import { APP_NAME, HIDE_COMPACT_MENU, LOGO, LOGO_COMPACT } from '@/common/constants';
import { MenuItem } from '@/components/navigation/components/menu-item';
import { Tooltip } from '@/components/tooltip';
import { UserRole, authStore } from '@/stores/auth';
import { uiStore } from '@/stores/ui';
import { useParseHash } from '@/utils/url';
import { DescriptionStatus } from './components/description-status';
import { type NavigationProps } from './types';
import './styles.css';

export const Navigation = observer(({ dashboardsStore, toggleConsole }: NavigationProps) => {
  const { t, i18n } = useTranslation();
  const { id, page, params } = useParseHash();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const { isAuthenticated, isAutologin, areUsersConfigured, hasRights, logout } = authStore;
  const [isMenuCompact, setIsMenuCompact] = useState(localStorage.getItem('isMenuCompact') === 'true');
  const [openedSubmenus, setOpenedSubmenus] = useState(['dashboards-all']);
  const [isMobileMenuOpened, setIsMobileMenuOpened] = useState(false);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const { menuItems } = uiStore;

  useEffect(() => {
    uiStore.buildMenu(dashboardsStore.dashboardsList, dashboardsStore.isShowWidgetsPage, params);
  }, [dashboardsStore.dashboardsList, dashboardsStore.isShowWidgetsPage, params, i18n.language, isAuthenticated]);

  const toggleNavigation = () => {
    const value = !isMenuCompact;
    setIsMenuCompact(value);
    localStorage.setItem('isMenuCompact', value.toString());
  };

  const handleDebugClick = () => {
    toggleConsole();
    setIsMobileMenuOpened(false);
  };

  useEffect(() => {
    if (!menuItems.some((item) => item.url === page)) {
      const val = menuItems.find((item) => item.children
        ?.some((subItem) => subItem.url === page || (id && subItem.url === `${page}/${id}`)));

      if (val?.id) {
        setOpenedSubmenus((prev) => {
          const next = new Set(prev);
          next.add(val.id);
          return Array.from(next);
        });
      }
    }
  }, [menuItems, page, id]);

  useEffect(() => {
    setIsMobileMenuOpened(false);
    setIsMenuCompact(isMobile ? false : localStorage.getItem('isMenuCompact') === 'true');
  }, [isMobile]);

  return !isAuthenticated || params.has('hmi') || location.hash.startsWith('#!/login') ? null : (
    <>
      <nav
        className={classNames('navigation', {
          'navigation-compact': isMenuCompact,
        })}
      >
        <div className="navigation-header">
          <button
            className="navigation-mobileButton"
            aria-label={t('navigation.labels.toggle')}
            onClick={() => setIsMobileMenuOpened(!isMobileMenuOpened)}
          >
            <MenuIcon />
          </button>

          <a href="/" draggable={false}>
            <img
              src={LOGO_COMPACT}
              className={classNames('navigation-logoCompact', {
                'navigation-logoHidden': !isMenuCompact,
              })}
              alt={APP_NAME}
            />
            <img
              src={LOGO}
              className={classNames('navigation-logo', {
                'navigation-logoHidden': isMenuCompact,
              })}
              alt={APP_NAME}
            />
          </a>
        </div>

        <DescriptionStatus
          isConnected={uiStore.isConnected}
          isCompact={isMenuCompact}
          description={dashboardsStore.description}
        />

        {!HIDE_COMPACT_MENU && (
          <button
            className={classNames('navigation-toggle', {
              'navigation-toggleIconRotated': !isMenuCompact,
            })}
            onClick={toggleNavigation}
          >
            <ChevronRightIcon className="navigation-toggleIcon" />
          </button>
        )}

        <div
          className={classNames('navigation-container', {
            'navigation-containerMobile': isMobileMenuOpened,
          })}
        >
          <ul className="navigation-list">
            {menuItems.map((item, i) => (
              <MenuItem
                item={item}
                isMenuCompact={isMenuCompact}
                openedSubmenus={openedSubmenus}
                setOpenedSubmenus={setOpenedSubmenus}
                id={id}
                page={page}
                setActivePopup={setActivePopup}
                activePopup={activePopup}
                closeMobileMenu={() => setIsMobileMenuOpened(false)}
                key={i}
              />
            ))}
          </ul>

          {!params.has('fullscreen') && (
            <div
              className={classNames('navigation-actions', {
                'navigation-actionsMultimple': hasRights(UserRole.Admin) && areUsersConfigured,
              })}
            >
              {isAuthenticated && areUsersConfigured && (
                <Tooltip
                  text={isMenuCompact
                    ? t(isAutologin
                      ? 'navigation.buttons.switch-user'
                      : 'navigation.buttons.logout')
                    : null}
                  placement="right"
                  className="navigation-tooltip"
                >
                  <button
                    className="menuItem-link navigation-logout"
                    draggable={false}
                    onClick={() => {
                      setIsMobileMenuOpened(false);
                      logout();
                    }}
                  >
                    <LogoutIcon className="menuItem-icon" />
                    {!isMenuCompact && t(isAutologin ? 'navigation.buttons.switch-user' : 'navigation.buttons.logout')}
                  </button>
                </Tooltip>
              )}

              {hasRights(UserRole.Admin) && (
                <Tooltip
                  text={isMenuCompact ? t('navigation.buttons.debug') : null}
                  placement="right"
                  className="navigation-tooltip"
                >
                  <button
                    className={classNames('menuItem-link')}
                    draggable={false}
                    onClick={handleDebugClick}
                  >
                    <ConsoleIcon className="menuItem-icon" />
                    {!isMenuCompact && t('navigation.buttons.debug')}
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </nav>
      {isMobileMenuOpened && <div className="navigation-overlay" onClick={() => setIsMobileMenuOpened(false)}></div>}
    </>
  );
});
