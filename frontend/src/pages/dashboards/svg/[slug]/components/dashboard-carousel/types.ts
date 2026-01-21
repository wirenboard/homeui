import { type PropsWithChildren } from 'react';
import { type SvgDashboardPageStore } from '../../store';

export type DashboardCarouselProps = PropsWithChildren<{ store: SvgDashboardPageStore; width: number }>;
