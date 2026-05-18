import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { getDeviceInfo } from '@/utils/httpsUtils';
import { useStore } from '@/utils/use-store';
import { Backup } from './components/backup';
import { CloudStatus } from './components/cloud-status';
import { Diagnostic } from './components/diagnostic';
import { FirmwareUpdate, FirmwareUpdateStore } from './components/firmware-update';
import type { SystemPageProps } from './types';
import './styles.css';

const SystemPage = ({ mqttClient, whenMqttReady, diagnosticProxy }: SystemPageProps) => {
  const { t } = useTranslation();
  const firmwareUpdateStore = useStore(() => new FirmwareUpdateStore(mqttClient, whenMqttReady));
  const [isShowOffer, setIsShowOffer] = useState(false);
  const [isShowTransitionOffer, setIsShowTransitionOffer] = useState(false);

  useEffect(() => {
    const isHideOffer = localStorage.getItem('hide-stable-notice') === 'true';
    const isHideTransitionOffer = localStorage.getItem('hide-transition-notice') === 'true';

    if (authStore.hasRights(UserRole.Admin) && !(isHideOffer && isHideTransitionOffer)) {
      getDeviceInfo().then((res) => {
        firmwareUpdateStore.setIsRootfsAlreadyExpanded(res.rootfs_expanded);
        if (res.release_suite === 'stable' && !isHideOffer) {
          setIsShowOffer(true);
        }
        if (typeof res.release_name === 'string'
          && res.release_name.endsWith('-transition')
          && !isHideTransitionOffer) {
          setIsShowTransitionOffer(true);
        }
      });
    }
  }, []);

  return (
    <PageLayout
      title={t('system.title')}
      hasRights={authStore.hasRights(UserRole.Admin)}
    >
      {isShowTransitionOffer && (
        <Alert
          className="system-testingOffer"
          variant="warn"
          onClose={() => {
            setIsShowTransitionOffer(false);
            localStorage.setItem('hide-transition-notice', 'true');
          }}
        >
          <Trans
            i18nKey="system.labels.transition-offer"
            components={[<a/>, <b/>]}
          />
        </Alert>
      )}

      {isShowOffer && (
        <Alert
          className="system-testingOffer"
          variant="info"
          onClose={() => {
            setIsShowOffer(false);
            localStorage.setItem('hide-stable-notice', 'true');
          }}
        >
          <Trans
            i18nKey="system.labels.testing-offer"
            components={[<a/>]}
          />
        </Alert>
      )}

      <section className="system">
        <CloudStatus
          className="system-card"
          mqttClient={mqttClient}
          whenMqttReady={whenMqttReady}
        />

        <FirmwareUpdate
          className="system-card"
          mode="update"
          store={firmwareUpdateStore}
        />

        <Backup className="system-card" />

        <Diagnostic
          className="system-card"
          diagnosticProxy={diagnosticProxy}
          mqttClient={mqttClient}
          whenMqttReady={whenMqttReady}
        />

        <FirmwareUpdate
          className="system-card"
          mode="reset"
          store={firmwareUpdateStore}
        />
      </section>
    </PageLayout>
  );
};

export default SystemPage;
