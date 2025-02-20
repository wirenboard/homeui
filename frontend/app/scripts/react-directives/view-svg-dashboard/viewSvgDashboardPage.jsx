import React, { useLayoutEffect, useRef, useState } from 'react';
import { Spinner } from '../common';
import { observer } from 'mobx-react-lite';
import ViewSvgDashboard from './viewSvgDashboard';
import { FullscreenContext } from '../components/fullscreen/fullscreenContext';
import { Carousel } from 'react-responsive-carousel';

import 'react-responsive-carousel/lib/styles/carousel.min.css';

export const ViewSvgDashboardPage = observer(({ store }) => {
  const ref = useRef(null);
  const [width, setWidth] = useState(25);

  useLayoutEffect(() => {
    const callback = () => {
      if (ref?.current) {
        setWidth(ref.current.getBoundingClientRect().width);
      }
    };
    callback();
    window.addEventListener('resize', callback);
    return () => {
      window.removeEventListener('resize', callback);
    };
  });

  return (
    <FullscreenContext.Provider value={store.fullscreen}>
      <div className="svg-view-page" ref={ref}>
        {store.loading ? (
          <Spinner />
        ) : (
          <>
            {store.dashboards.length == 1 ? (
              <ViewSvgDashboard
                key={store.dashboards[0].id}
                store={store.dashboards[0]}
                canEdit={store.editAccessLevelStore.accessGranted}
              />
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
                swipeScrollTolerance={width / 3}
              >
                {store.dashboards.map((d, index) => (
                  <ViewSvgDashboard
                    key={d.dashboard.id || index}
                    store={d}
                    canEdit={store.editAccessLevelStore.accessGranted}
                  />
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
