import { observer } from 'mobx-react-lite';
import { Carousel } from 'react-responsive-carousel';
import { type DashboardCarouselProps } from './types';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import './styles.css';

export const DashboardCarousel = observer(({ children, width, store }: DashboardCarouselProps) => {
  return store.dashboards.length === 1
    ? children
    : (
      <Carousel
        className="dashboardCarousel"
        selectedItem={store.dashboardIndex}
        showThumbs={false}
        centerMode={false}
        showArrows={false}
        showStatus={false}
        showIndicators={false}
        infiniteLoop={false}
        key={store.dashboardId}
        swipeScrollTolerance={width / 3}
        emulateTouch
        onChange={(index) => store.moveToDashboard(store.dashboards[index].id)}
      >
        {children as any}
      </Carousel>
    );
});
