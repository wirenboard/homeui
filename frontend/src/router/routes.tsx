import { lazy } from 'react';
import { redirect, type RouteObject } from 'react-router-dom';
import { DefaultLayout } from '@/layouts/default';
import { legacyParamRedirects, legacyStaticRedirects } from './legacy-redirects';
import { authGuard, homeRedirect } from './middlewares';

const LoginPage = lazy(() => import('@/pages/login'));
const DashboardsPage = lazy(() => import('@/pages/dashboards/index'));
const DashboardPage = lazy(() => import('@/pages/dashboards/[slug]'));
const SvgDashboardPage = lazy(() => import('@/pages/dashboards/svg/[slug]/index'));
const EditSvgDashboardPage = lazy(() => import('@/pages/dashboards/svg/[slug]/edit'));
const WidgetsPage = lazy(() => import('@/pages/dashboards/widgets'));
const DevicesPage = lazy(() => import('@/pages/devices'));
const AlicePage = lazy(() => import('@/pages/integrations/alice'));
const HistoryPage = lazy(() => import('@/pages/history'));
const RulesPage = lazy(() => import('@/pages/rules/index'));
const RulePage = lazy(() => import('@/pages/rules/[rule]'));
const ConfigsPage = lazy(() => import('@/pages/settings/configs/index'));
const ConfigPage = lazy(() => import('@/pages/settings/configs/[path]'));
const DeviceManagerPage = lazy(() => import('@/pages/settings/device-manager'));
const NetworkConnectionsPage = lazy(() => import('@/pages/settings/network-connections'));
const MbGatePage = lazy(() => import('@/pages/settings/configs/mbgate'));
const DaliPage = lazy(() => import('@/pages/settings/configs/dali'));
const WebUiPage = lazy(() => import('@/pages/settings/web-ui'));
const SystemPage = lazy(() => import('@/pages/settings/system'));
const MqttChannelsPage = lazy(() => import('@/pages/settings/mqtt-channels'));
const UsersPage = lazy(() => import('@/pages/settings/users'));
const LogsPage = lazy(() => import('@/pages/settings/logs'));

export const routes: RouteObject[] = [
  {
    path: 'login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <DefaultLayout />,
    HydrateFallback: () => <div />,
    middleware: [authGuard],
    children: [
      {
        index: true,
        element: null,
        middleware: [homeRedirect],
      },
      {
        path: 'dashboards',
        children: [
          {
            index: true,
            element: <DashboardsPage />,
          },
          {
            path: ':id',
            element: <DashboardPage />,
          },
          {
            path: 'svg/view/:id',
            element: <SvgDashboardPage />,
          },
          {
            path: 'svg/edit/:id',
            element: <EditSvgDashboardPage />,
          },
          {
            path: 'svg/add',
            element: <EditSvgDashboardPage />,
          },
          {
            path: 'widgets',
            element: <WidgetsPage />,
          },
        ],
      },
      {
        path: 'devices',
        element: <DevicesPage />,
      },
      {
        path: 'integrations',
        children: [
          {
            path: 'alice',
            element: <AlicePage />,
          },
        ],
      },
      {
        path: 'history',
        children: [
          {
            index: true,
            element: <HistoryPage />,
          },
          {
            path: ':id',
            element: <HistoryPage />,
          },
        ],
      },
      {
        path: 'rules',
        children: [
          {
            index: true,
            element: <RulesPage />,
          },
          {
            path: 'new',
            element: <RulePage />,
          },
          {
            path: '*',
            element: <RulePage />,
          },
        ],
      },
      {
        path: 'settings',
        children: [
          {
            path: 'configs',
            children: [
              {
                index: true,
                element: <ConfigsPage />,
              },
              {
                path: 'mbgate',
                element: <MbGatePage />,
              },
              {
                path: 'serial-config',
                element: <DeviceManagerPage />,
              },
              {
                path: 'network-connections',
                element: <NetworkConnectionsPage />,
              },
              {
                path: 'dali',
                element: <DaliPage />,
              },
              {
                path: ':id',
                element: <ConfigPage />,
              },
            ],
          },
          {
            path: 'ui',
            element: <WebUiPage />,
          },
          {
            path: 'system',
            element: <SystemPage />,
          },
          {
            path: 'mqtt-channels',
            element: <MqttChannelsPage />,
          },
          {
            path: 'users',
            element: <UsersPage />,
          },
          {
            path: 'logs',
            element: <LogsPage />,
          },
        ],
      },
    ],
  },
  // Outdated routes (#!/ prefix handled for in-app navigation)
  { path: '!/*', loader: ({ params }) => redirect(`/${params['*']}`) },
  ...Object.entries(legacyStaticRedirects).map(([from, to]) => ({
    path: from.slice(1),
    loader: () => redirect(to),
  })),
  ...legacyParamRedirects.map(({ prefix, target }) => ({
    path: `${prefix.slice(1)}*`,
    loader: ({ params }) => {
      const encoded = (params['*'] ?? '').split('/').map(encodeURIComponent).join('/');
      return redirect(`${target}${encoded}`);
    },
  })),
  { path: '*', loader: () => redirect('/') },
];
