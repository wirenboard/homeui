import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import ChevronRightDoubleIcon from '@/assets/icons/chevron-right-double.svg';
import CloseIcon from '@/assets/icons/close.svg';
import LayoutBottomIcon from '@/assets/icons/layout-bottom.svg';
import LayoutRightIcon from '@/assets/icons/layout-right.svg';
import { Tabs } from '@/components/tabs';
import { Tooltip } from '@/components/tooltip';
import { consolePanelStore as store } from '@/stores/console-panel';
import { getOverflowIds } from './get-overflow-ids';
import './styles.css';

const OVERFLOW_BTN_SPACE = 26;

export const ConsolePanel = observer(() => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const container = useRef<HTMLDivElement>(null);
  const resizer = useRef<HTMLDivElement>(null);
  const positionRef = useRef(store.position);

  const measureRef = useRef<HTMLDivElement>(null);
  const tabsAreaRef = useRef<HTMLDivElement>(null);
  const [tabWidths, setTabWidths] = useState<Record<string, number>>({});
  const [areaWidth, setAreaWidth] = useState(0);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);

  const { refs: overflowRefs, floatingStyles: overflowStyles, context: overflowContext } = useFloating({
    open: isOverflowMenuOpen,
    onOpenChange: setIsOverflowMenuOpen,
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableWidth, elements }) {
          elements.floating.style.maxWidth = `${Math.min(availableWidth, 300)}px`;
        },
      }),
    ],
  });

  const {
    getReferenceProps: getOverflowRefProps,
    getFloatingProps: getOverflowFloatingProps,
  } = useInteractions([
    useClick(overflowContext),
    useDismiss(overflowContext),
    useRole(overflowContext, { role: 'menu' }),
  ]);

  const activeTab = store.activeTab;

  const tabItems = store.tabs.map((tab) => ({
    id: tab.id,
    label: tab.closable
      ? (
        <span className="consolePanel-tabLabel">
          <span className="consolePanel-tabText">{tab.label}</span>
          <span
            role="button"
            tabIndex={0}
            className="consolePanel-tabClose"
            aria-label={t('console-panel.buttons.close-tab')}
            onClick={(ev) => {
              ev.stopPropagation();
              store.unregisterTab(tab.id);
            }}
          >
            <CloseIcon className="consolePanel-tabCloseIcon" />
          </span>
        </span>
      )
      : tab.label,
  }));

  const tabIds = store.tabs.map((t) => t.id).join(',');

  useLayoutEffect(() => {
    const measureEl = measureRef.current;
    if (measureEl) {
      const lis = measureEl.querySelectorAll<HTMLLIElement>('[role="tablist"] > li');
      const tabs = store.tabs;
      const widths: Record<string, number> = {};
      lis.forEach((li, i) => {
        if (i < tabs.length) {
          widths[tabs[i].id] = li.getBoundingClientRect().width;
        }
      });
      setTabWidths(widths);
    }

    const areaEl = tabsAreaRef.current;
    if (areaEl) {
      setAreaWidth(areaEl.getBoundingClientRect().width);
    }
  }, [tabIds, store.activeTabId]);

  useEffect(() => {
    const el = tabsAreaRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setAreaWidth(el.getBoundingClientRect().width);
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const overflowIds = useMemo(
    () => getOverflowIds(store.tabs, tabWidths, areaWidth, store.activeTabId, OVERFLOW_BTN_SPACE),
    [tabWidths, areaWidth, store.activeTabId, store.tabs],
  );

  const visibleTabItems = tabItems.filter((item) => !overflowIds.has(item.id));
  const overflowTabs = store.tabs.filter((tab) => overflowIds.has(tab.id));

  const dragStart = useRef<{ size: number; coord: number } | null>(null);
  const rafId = useRef(0);

  const handleResizerDown = useCallback((ev: PointerEvent) => {
    const target = ev.target as HTMLElement;
    if (resizer.current && target.id === 'consoleResizer') {
      resizer.current.setPointerCapture(ev.pointerId);
      const rect = container.current.getBoundingClientRect();
      if (positionRef.current === 'bottom') {
        dragStart.current = { size: rect.height, coord: ev.clientY };
      } else {
        dragStart.current = { size: rect.width, coord: ev.clientX };
      }
    }
  }, []);

  const handleResizerMove = useCallback((ev: PointerEvent) => {
    if (!resizer.current || !resizer.current.hasPointerCapture(ev.pointerId) || !dragStart.current) {
      return;
    }

    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (!dragStart.current) return;

      if (positionRef.current === 'bottom') {
        const max = window.innerHeight * 0.7;
        const val = Math.min(Math.max(dragStart.current.size - (ev.clientY - dragStart.current.coord), 50), max);
        store.setHeight(`${val}px`);
      } else {
        const max = window.innerWidth * 0.7;
        const val = Math.min(Math.max(dragStart.current.size - (ev.clientX - dragStart.current.coord), 50), max);
        store.setWidth(`${val}px`);
      }
    });
  }, []);

  const changePosition = (pos: 'bottom' | 'right', isWithSave = true) => {
    if (isWithSave) {
      store.setPosition(pos);
    }
  };

  useEffect(() => {
    addEventListener('pointerdown', handleResizerDown);
    addEventListener('pointermove', handleResizerMove);

    return () => {
      removeEventListener('pointerdown', handleResizerDown);
      removeEventListener('pointermove', handleResizerMove);
    };
  }, []);

  useEffect(() => {
    if (container.current) {
      container.current.focus();
    }
  }, []);

  useEffect(() => {
    positionRef.current = store.position;
  }, [store.position]);

  useEffect(() => {
    if (isMobile && store.position === 'right') {
      changePosition('bottom', false);
    } else if (!isMobile && localStorage.getItem('console-panel-position') === 'right') {
      changePosition('right', false);
    }
  }, [isMobile]);

  return (
    <aside
      className={classNames('consolePanel', {
        'consolePanel-bottom': store.position === 'bottom',
        'consolePanel-right': store.position === 'right',
      })}
      ref={container}
      aria-label={t('console-panel.title')}
      tabIndex={0}
      style={{
        height: store.position === 'bottom' ? store.height : '100%',
        width: store.position === 'right' ? store.width : '100%',
      }}
    >
      <div className="consolePanel-resizer" id="consoleResizer" ref={resizer} />

      <div className="consolePanel-tabsMeasure" ref={measureRef} aria-hidden="true">
        <Tabs
          className="consolePanel-tabs"
          items={tabItems}
          activeTab={store.activeTabId}
          orientation="horizontal"
          onTabChange={() => {}}
        />
      </div>

      <header className="consolePanel-header">
        <div className="consolePanel-tabsArea" ref={tabsAreaRef}>
          <div className="consolePanel-tabsWrapper">
            <Tabs
              className="consolePanel-tabs"
              items={visibleTabItems}
              activeTab={store.activeTabId}
              orientation="horizontal"
              onTabChange={store.setActiveTab}
            />
          </div>

          {overflowTabs.length > 0 && (
            <div className="consolePanel-overflow">
              <Tooltip text={isOverflowMenuOpen ? '' : t('console-panel.buttons.more-tabs')}>
                <button
                  ref={overflowRefs.setReference}
                  className="consolePanel-button consolePanel-overflowBtn"
                  aria-label={t('console-panel.buttons.more-tabs')}
                  {...getOverflowRefProps()}
                >
                  <ChevronRightDoubleIcon className="consolePanel-overflowIcon" />
                </button>
              </Tooltip>

              {isOverflowMenuOpen && (
                <FloatingPortal>
                  <ul
                    ref={overflowRefs.setFloating}
                    className="consolePanel-overflowMenu"
                    style={overflowStyles}
                    role="menu"
                    {...getOverflowFloatingProps()}
                  >
                    {overflowTabs.map((tab) => (
                      <li key={tab.id} role="none">
                        <button
                          role="menuitem"
                          className={classNames('consolePanel-overflowMenuItem', {
                            'consolePanel-overflowMenuItemActive': tab.id === store.activeTabId,
                          })}
                          onClick={() => {
                            store.setActiveTab(tab.id);
                            setIsOverflowMenuOpen(false);
                          }}
                        >
                          <span className="consolePanel-overflowMenuLabel">{tab.label}</span>
                          {tab.closable && (
                            <span
                              role="button"
                              tabIndex={0}
                              className="consolePanel-tabClose"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                store.unregisterTab(tab.id);
                              }}
                            >
                              <CloseIcon className="consolePanel-tabCloseIcon" />
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </FloatingPortal>
              )}
            </div>
          )}
        </div>

        <div className="consolePanel-headerActions">
          {activeTab?.renderToolbar?.()}

          <div className="consolePanel-separatorLeft">
            <Tooltip text={t('console-panel.buttons.dock-bottom')}>
              <button
                className="consolePanel-button"
                aria-label={t('console-panel.buttons.dock-bottom')}
                onClick={() => changePosition('bottom')}
              >
                <LayoutBottomIcon
                  className={classNames('consolePanel-icon', {
                    'consolePanel-iconActive': store.position === 'bottom',
                  })}
                />
              </button>
            </Tooltip>

            <Tooltip text={t('console-panel.buttons.dock-right')}>
              <button
                className="consolePanel-button"
                disabled={isMobile}
                aria-label={t('console-panel.buttons.dock-right')}
                onClick={() => changePosition('right')}
              >
                <LayoutRightIcon
                  className={classNames('consolePanel-icon', {
                    'consolePanel-iconActive': store.position === 'right',
                  })}
                />
              </button>
            </Tooltip>

            <Tooltip text={t('console-panel.buttons.close')}>
              <button
                className="consolePanel-button consolePanel-close"
                aria-label={t('console-panel.buttons.close')}
                onClick={store.hide}
              >
                <CloseIcon className="consolePanel-icon" />
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      {activeTab && activeTab.renderContent()}
    </aside>
  );
});
