import React from 'react';
import { observer } from 'mobx-react-lite';

const CollapseButton = observer(({ state, stopPropagation }) => {
  return (
    <i
      className={
        state.collapsed ? 'glyphicon glyphicon-chevron-right' : 'glyphicon glyphicon-chevron-down'
      }
      onClick={e => {
        if (stopPropagation) {
          e.stopPropagation();
        }
        state.setCollapsed(!state.collapsed);
      }}
    ></i>
  );
});

export default CollapseButton;
