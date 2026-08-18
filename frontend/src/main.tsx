import { autorun, when } from 'mobx';
import { createRoot } from 'react-dom/client';
import { createHashRouter } from 'react-router-dom';
import { APP_NAME, APP_SHORT_NAME } from '@/common/constants';
import { registerTerminalTab } from '@/components/terminal';
import { App } from '@/layouts/app';
import { deviceManagerProxy, mqttClient } from '@/services';
import { authStore, UserRole } from '@/stores/auth';
import { daliGlobalStore } from '@/stores/dali';
import { dashboardsStore } from '@/stores/dashboards';
import { registerRulesTab, rulesStore } from '@/stores/rules';
import { HttpsSetupPhase, uiStore } from '@/stores/ui';
import { CertificateStatus, findHttpsRedirectTarget, switchToHttps } from '@/utils/https-utils';
import { routes } from './router/routes';
import './i18n/config';
import 'glyphicons-only-bootstrap/css/bootstrap.min.css';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import './assets/styles/index.css';

// Stale assets after a rebuild — reload to pick up the new HTML with fresh hashes
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// createHashRouter() runs authGuard at once, so build the router only if we stay on this host:
// the session cookie is host-bound, and the switch usually sends us to another hostname.
let isAppStarted = false;
const startApp = () => {
  if (isAppStarted) {
    return;
  }
  isAppStarted = true;
  uiStore.setHttpsSetupPhase(HttpsSetupPhase.Done);
  root.render(<App router={createHashRouter(routes)} />);
};

findHttpsRedirectTarget()
  .then((deviceInfo) => {
    if (!deviceInfo) {
      return false;
    }
    if (deviceInfo.https_cert !== CertificateStatus.VALID) {
      // Issuing a certificate takes minutes, and that is what the loader has to talk about
      uiStore.setHttpsSetupPhase(HttpsSetupPhase.IssuingCertificate);
    }
    return switchToHttps(deviceInfo);
  })
  .catch((err) => {
    console.warn('Failed to switch to HTTPS', err);
    return false;
  })
  .then((isRedirectingToHttps) => {
    if (!isRedirectingToHttps) {
      startApp();
    }
  })
  .catch((err) => {
    console.error('Failed to start the app', err);
  });

// A started redirect leaves this page alive with no router. Coming back to it means the target host
// did not work out, so run the app here instead of restoring a dead loader from the bfcache.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    startApp();
  }
});

let connectToMqtt = true;
when(() => authStore.isAuthenticated).then(() => {
  if (connectToMqtt) {
    const loginUrl = new URL('/mqtt', location.origin);
    loginUrl.protocol = loginUrl.protocol.replace('http', 'ws');
    const user = localStorage['user'];
    const password = localStorage['password'];

    mqttClient.reconnect(loginUrl.href, user, password);

    registerTerminalTab();

    mqttClient.whenConnected()
      .then(() => {
        rulesStore.subscribeRulesLogs();
        rulesStore.subscribeRuleDebugging();
        registerRulesTab();
        daliGlobalStore.refresh().catch((err) => {
          console.warn('Failed to load DALI gateways on startup', err);
        });
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
