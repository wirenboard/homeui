import React, { useContext } from 'react';
import { Spinner, Button } from '../common';
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

const ViewSvgDashboardPage = observer(({ pageStore }) => {
  return (
    <FullscreenContext.Provider value={pageStore.fullscreen}>
      <div className="svg-view-page">
        {pageStore.loading ? (
          <Spinner />
        ) : (
          <>
            <ViewSvgDashboardHeader
              title={pageStore.dashboard.content.name}
              forceFullscreen={pageStore.forceFullscreen}
              onEdit={() => pageStore.editFn()}
            />
            <SvgView
              svg={pageStore.dashboard.content.svg.current}
              className={pageStore.dashboard.content.svg_fullwidth ? 'fit-to-page' : ''}
              params={pageStore.dashboard.content.svg.params}
              values={pageStore.channelValues}
              switchValue={(channel, value) => pageStore.switchValue(channel, value)}
            />
          </>
        )}
      </div>
    </FullscreenContext.Provider>
  );
});

function CreateViewSvgDashboardPage({ pageStore }) {
  return <ViewSvgDashboardPage pageStore={pageStore}></ViewSvgDashboardPage>;
}

export default CreateViewSvgDashboardPage;
