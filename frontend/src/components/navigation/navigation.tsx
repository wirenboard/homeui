import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { useNavigate, useLocation, Link, useParams, useSearchParams } from 'react-router-dom';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import ConsoleIcon from '@/assets/icons/console.svg';
import LogoutIcon from '@/assets/icons/logout.svg';
import MenuIcon from '@/assets/icons/menu.svg';
import { APP_NAME, HIDE_COMPACT_MENU, LOGO, LOGO_COMPACT } from '@/common/constants';
import { MenuItem } from '@/components/navigation/components/menu-item';
import { Tooltip } from '@/components/tooltip';
import { UserRole, authStore } from '@/stores/auth';
import { consolePanelStore } from '@/stores/console-panel';
import { dashboardsStore } from '@/stores/dashboards';
import { uiStore } from '@/stores/ui';
import { DescriptionStatus } from './components/description-status';
import './styles.css';

export const Navigation = observer(() => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const { isAuthenticated, isAutologin, areUsersConfigured, hasRights, logout } = authStore;
  const [isMenuCompact, setIsMenuCompact] = useState(localStorage.getItem('isMenuCompact') === 'true');
  const [openedSubmenus, setOpenedSubmenus] = useState(['dashboards-all']);
  const [isMenuFocused, setIsMenuFocused] = useState(true);
  const [isMobileMenuOpened, setIsMobileMenuOpened] = useState(false);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const { menuItems } = uiStore;

  useEffect(() => {
    uiStore.buildMenu(dashboardsStore.dashboardsList, dashboardsStore.isShowWidgetsPage, searchParams);
  }, [dashboardsStore.dashboardsList, dashboardsStore.isShowWidgetsPage, params, i18n.language, isAuthenticated]);

  const toggleNavigation = () => {
    const value = !isMenuCompact;
    setIsMenuCompact(value);
    localStorage.setItem('isMenuCompact', value.toString());
  };

  const handleDebugClick = () => {
    consolePanelStore.toggleVisibility();
    setIsMobileMenuOpened(false);
  };

  useEffect(() => {
    const matchesPage = (url?: string) =>
      !!url && (location.pathname === url || location.pathname.startsWith(url + '/'));

    if (!menuItems.some((item) => matchesPage(item.url))) {
      const val = menuItems.find((item) => item.children
        ?.some((subItem) => matchesPage(subItem.url)));

      if (val?.id) {
        setOpenedSubmenus((prev) => {
          const next = new Set(prev);
          next.add(val.id);
          return Array.from(next);
        });
      }
    }
  }, [menuItems, location.pathname]);

  useEffect(() => {
    setIsMobileMenuOpened(false);
    setIsMenuCompact(isMobile ? false : localStorage.getItem('isMenuCompact') === 'true');
  }, [isMobile]);

  const handleLogout = () => {
    setIsMobileMenuOpened(false);
    logout().then(() => {
      if (authStore.isAutologin) {
        // If the user is an autologin user, just show login page to select another user.
        navigate('/login');
      } else {
        const params = new URLSearchParams({
          returnState: location.pathname,
        });
        navigate(`/login?${params}`);
      }
    });
  };

  return searchParams.has('hmi') ? null : (
    <>
      <nav
        className={classNames('navigation', {
          'navigation-compact': isMenuCompact,
        })}
      >
        <div className="navigation-header">
          <button
            className="navigation-mobileButton"
            aria-label={t('navigation.buttons.open-mobile')}
            onClick={() => setIsMobileMenuOpened(!isMobileMenuOpened)}
          >
            <MenuIcon />
          </button>

          <div
            className={classNames({
              'navigation-logoWrapper': !isMenuCompact,
              'navigation-logoWrapperCompact': isMenuCompact,
            })}
          >
            <Link
              to="/"
              aria-label={t('navigation.labels.home')}
              className="navigation-logoLink"
              draggable={false}
            >
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
            </Link>
          </div>
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
            aria-label={isMenuCompact ? t('navigation.buttons.compact-off') : t('navigation.buttons.compact-on')}
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
                id={params.id}
                page={location.pathname}
                setActivePopup={setActivePopup}
                activePopup={activePopup}
                closeMobileMenu={() => setIsMobileMenuOpened(false)}
                key={i}
                isMenuFocused={isMenuFocused}
                setIsMenuFocused={setIsMenuFocused}
              />
            ))}
          </ul>

          {!searchParams.has('fullscreen') && (
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
                    aria-label={t(isAutologin ? 'navigation.buttons.switch-user' : 'navigation.buttons.logout')}
                    tabIndex={isMenuFocused ? null : -1}
                    onFocus={() => setIsMenuFocused(true)}
                    onBlur={() => setIsMenuFocused(false)}
                    onClick={handleLogout}
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
                    aria-label={t('navigation.buttons.debug')}
                    tabIndex={isMenuFocused ? null : -1}
                    aria-expanded={consolePanelStore.isVisible}
                    onFocus={() => setIsMenuFocused(true)}
                    onBlur={() => setIsMenuFocused(false)}
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
