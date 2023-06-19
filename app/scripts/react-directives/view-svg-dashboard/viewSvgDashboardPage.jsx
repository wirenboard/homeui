import React, { useState, useRef, useLayoutEffect } from 'react';
import { Spinner } from '../common';
import { observer } from 'mobx-react-lite';
import ViewSvgDashboard from './viewSvgDashboard';
import { FullscreenContext } from '../components/fullscreen/fullscreenContext';
import { Carousel } from 'react-responsive-carousel';

import 'react-responsive-carousel/lib/styles/carousel.min.css';

export const ViewSvgDashboardPage = observer(({ store }) => {
  return (
    <FullscreenContext.Provider value={store.fullscreen}>
      <div className="svg-view-page">
        {store.loading ? (
          <Spinner />
        ) : (
          <>
            {store.dashboards.length == 1 ? (
              <ViewSvgDashboard key={store.dashboards[0].id} store={store.dashboards[0]} />
            ) : (
              <Carousel
                withoutControls={true}
                onChange={index => store.slideChanged(index)}
                selectedItem={store.dashboardIndex}
                showThumbs={false}
                emulateTouch={true}
                centerMode={false}
                showArrows={false}
                showStatus={false}
                showIndicators={false}
                infiniteLoop={false}
                key={store.key}
              >
                {store.dashboards.map((d, index) => (
                  <ViewSvgDashboard key={d.dashboard.id} store={d} />
                ))}
              </Carousel>
            )}
          </>
        )}
      </div>
    </FullscreenContext.Provider>
  );
});

function CreateViewSvgDashboardPage({ pageStore }) {
  return <ViewSvgDashboardPage store={pageStore}></ViewSvgDashboardPage>;
}

export default CreateViewSvgDashboardPage;
