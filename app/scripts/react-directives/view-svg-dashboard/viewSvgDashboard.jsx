import React, { useContext } from 'react';
import { Button } from '../common';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import SvgView from './svgView';
import { FullscreenContext } from '../components/fullscreen/fullscreenContext';

const ViewSvgDashboardHeader = observer(({ title, forceFullscreen, onEdit }) => {
  const { t } = useTranslation();
  const fullscreen = useContext(FullscreenContext);
  return (
    <h1 className="page-header">
      <span>{title}</span>
      <div className="pull-right button-group">
        {!(fullscreen.isFullscreen || forceFullscreen) && (
          <Button
            type="success"
            label={t('view-svg-dashboard.buttons.edit')}
            onClick={onEdit}
          ></Button>
        )}
        {!forceFullscreen && (
          <Button
            icon={
              fullscreen.isFullscreen
                ? 'glyphicon glyphicon-resize-small'
                : 'glyphicon glyphicon-resize-full'
            }
            title={t(
              fullscreen.isFullscreen
                ? 'view-svg-dashboard.buttons.exit-fullscreen'
                : 'view-svg-dashboard.buttons.fullscreen'
            )}
            onClick={() => fullscreen.toggleFullscreen()}
          ></Button>
        )}
      </div>
    </h1>
  );
});

const ViewSvgDashboard = observer(({ store }) => {
  return (
    <div className="view-svg-dashboard">
      <ViewSvgDashboardHeader
        title={store?.dashboard?.name}
        forceFullscreen={store.forceFullscreen}
        onEdit={() => store.editDashboard()}
      />
      <SvgView
        svg={store?.dashboard?.svg?.current}
        className={store?.dashboard?.svg_fullwidth ? 'fit-to-page' : ''}
        params={store?.dashboard?.svg?.params}
        values={store.channelValues}
        onSwitchValue={(channel, value) => store.switchValue(channel, value)}
        onMoveToDashboard={dashboard => store.moveToDashboard(dashboard)}
      />
    </div>
  );
});

export default ViewSvgDashboard;
