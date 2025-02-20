'use strict';

import React from 'react';

const CollapsiblePanel = ({ title, children }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'baseline' }}>
        <button
          style={{ marginBottom: '10px' }}
          className="btn btn-default"
          onClick={() => setCollapsed(!collapsed)}
        >
          <i
            className={
              collapsed ? 'glyphicon glyphicon-chevron-right' : 'glyphicon glyphicon-chevron-down'
            }
          ></i>
        </button>
        <span>{title}</span>
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  );
};

export default CollapsiblePanel;
