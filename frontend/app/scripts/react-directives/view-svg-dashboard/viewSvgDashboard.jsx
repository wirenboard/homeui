import { observer } from 'mobx-react-lite';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import { FullscreenContext } from '../components/fullscreen/fullscreenContext';
import SvgView from './svgView';

const ViewSvgDashboardHeader = observer(({ title, forceFullscreen, onEdit, canEdit }) => {
  const { t } = useTranslation();
  const fullscreen = useContext(FullscreenContext);
  return (
    <h1 className="page-header">
      <span>{title}</span>
      <div className="pull-right button-group">
        {canEdit && !(fullscreen.isFullscreen || forceFullscreen) && (
          <Button
            type="primary"
            label={t('view-svg-dashboard.buttons.edit')}
            onClick={onEdit}
          />
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
          />
        )}
      </div>
    </h1>
  );
});

const ViewSvgDashboard = observer(({ store, currentDashboard, canEdit }) => {
  return (
    <div className="view-svg-dashboard">
      <ViewSvgDashboardHeader
        title={store?.dashboard?.name}
        forceFullscreen={store.forceFullscreen}
        canEdit={canEdit}
        onEdit={() => store.editDashboard()}
      />
      <SvgView
        id={store?.dashboard.id}
        svg={store?.dashboard?.svg?.current}
        className={store?.dashboard?.svg_fullwidth ? 'fit-to-page' : ''}
        params={store?.dashboard?.svg?.params}
        values={store.channelValues}
        currentDashboard={currentDashboard}
        onSwitchValue={(channel, value) => store.switchValue(channel, value)}
        onMoveToDashboard={(dashboard) => store.moveToDashboard(dashboard)}
      />
    </div>
  );
});

export default ViewSvgDashboard;
