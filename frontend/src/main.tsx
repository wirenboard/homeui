import { autorun, runInAction, when } from 'mobx';
import { createRoot } from 'react-dom/client';
import { createHashRouter } from 'react-router-dom';
import { APP_NAME, APP_SHORT_NAME } from '@/common/constants';
import { App } from '@/layouts/app';
import { deviceManagerProxy, mqttClient } from '@/services';
import { authStore, UserRole } from '@/stores/auth';
import { dashboardsStore } from '@/stores/dashboards';
import { registerRulesTab, rulesStore } from '@/stores/rules';
import { uiStore } from '@/stores/ui';
import { switchToHttps } from '@/utils/https-utils';
import { routes } from './router/routes';
import './i18n/config';
import 'glyphicons-only-bootstrap/css/bootstrap.min.css';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import './assets/styles/index.css';

// Stale assets after a rebuild — reload to pick up the new HTML with fresh hashes
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

document.documentElement.setAttribute('data-theme', 'bootstrap');

switchToHttps().finally(() => {
  runInAction(() => {
    uiStore.isSettingUpHttps = false;
  });
});

let connectToMqtt = true;
when(() => authStore.isAuthenticated).then(() => {
  if (connectToMqtt) {
    const loginUrl = new URL('/mqtt', location.origin);
    loginUrl.protocol = loginUrl.protocol.replace('http', 'ws');
    const user = localStorage['user'];
    const password = localStorage['password'];

    mqttClient.reconnect(loginUrl.href, user, password);

    mqttClient.whenConnected()
      .then(() => {
        rulesStore.subscribeRulesLogs();
        rulesStore.subscribeRuleDebugging();
        registerRulesTab();
        return dashboardsStore.loadData();
      })
      .catch(() => {
        console.error('app.errors.load');
      });

    connectToMqtt = false;
  }
});

autorun(() => {
  const name = dashboardsStore.description;
  const appTitle = name ? `${name} | ${APP_SHORT_NAME || APP_NAME}` : APP_NAME;
  const pageTitle = uiStore.showPageInTitle ? uiStore.currentPageTitle : '';
  document.title = pageTitle ? `${pageTitle} – ${appTitle}` : appTitle;
});

mqttClient.whenConnected().then(async () => {
  if (authStore.hasRights(UserRole.Admin)) {
    return deviceManagerProxy.Stop().catch(() => {});
  }
});

const router = createHashRouter(routes);

createRoot(document.getElementById('root')).render(
  <App router={router} />,
);
