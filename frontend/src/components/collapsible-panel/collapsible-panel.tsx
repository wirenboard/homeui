import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import { Button } from '@/components/button';
import './styles.css';

export const CollapsiblePanel = ({ title, isCollapsed = false, children }) => {
  const { t } = useTranslation();
  const titleId = useId();
  const [collapsed, setCollapsed] = useState(isCollapsed);

  return (
    <section className="collapsiblePanel-container">
      {/* Not a <label>: a label forwards clicks on its text to the button, but
          Chrome also forwards a click that lands on the button's own icon, so a
          click on the chevron toggled twice — i.e. did nothing. One handler on
          the row covers text, empty space, and the button (keyboard included:
          Enter/Space on the button fire a click that bubbles here). */}
      <div className="collapsiblePanel-label" onClick={() => setCollapsed(!collapsed)}>
        <Button
          className="collapsiblePanel-button"
          variant="secondary"
          size="small"
          aria-expanded={!collapsed}
          aria-labelledby={titleId}
          aria-label={collapsed ? t('common.buttons.expand') : t('common.buttons.collapse')}
          icon={collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
        />
        <span id={titleId}>{title}</span>
      </div>
      {!collapsed && <div>{children}</div>}
    </section>
  );
};
