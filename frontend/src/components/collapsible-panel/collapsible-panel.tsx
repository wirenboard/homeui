import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import { Button } from '@/components/button';
import './styles.css';

export const CollapsiblePanel = ({ title, children }) => {
  const { t } = useTranslation();
  const titleId = useId();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="collapsiblePanel-container">
      <label className="collapsiblePanel-label">
        <Button
          className="collapsiblePanel-button"
          variant="secondary"
          size="small"
          aria-expanded={!collapsed}
          aria-labelledby={titleId}
          aria-label={collapsed ? t('common.buttons.expand') : t('common.buttons.collapse')}
          icon={collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
          onClick={() => setCollapsed(!collapsed)}
        />
        <span id={titleId}>{title}</span>
      </label>
      {!collapsed && <div>{children}</div>}
    </section>
  );
};
