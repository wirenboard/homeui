import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';

const CollapsiblePanel = ({ title, children }) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = React.useState(false);
  const labelId = useId();

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'baseline' }}>
        <button
          style={{ marginBottom: '10px' }}
          className="btn btn-default"
          aria-labelledby={labelId}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('common.buttons.expand') : t('common.buttons.collapse')}
          onClick={() => setCollapsed(!collapsed)}
        >
          <i
            className={
              collapsed ? 'glyphicon glyphicon-chevron-right' : 'glyphicon glyphicon-chevron-down'
            }
          />
        </button>
        <span id={labelId}>{title}</span>
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  );
};

export default CollapsiblePanel;
