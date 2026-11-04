import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/alert';
import { Card } from '@/components/card';
import { Tag } from '@/components/tag';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { uiStore } from '@/stores/ui';
import { CopyField } from './components/copy-field';
import ExampleQr from './example-qr.svg';
import { PAIRING_CODE, PAIRING_CODE_GROUPED, PAIRING_PAYLOAD } from './placeholder';
import './styles.css';

// The menu entry is shipped by wb-mqtt-matter-bridge itself, so its id in the custom menu
// is the only sign the frontend has that the service is installed. The route exists in any
// case, and without this check the page would show pairing data for a bridge that is not
// there.
const MODULE_ID = 'matter';

const MatterPage = observer(() => {
  const { t } = useTranslation();
  // buildMenu fills menuItems and modules in one go, so an empty menu means /ui/menu has
  // not answered yet: the module is not missing, it is still unknown.
  const isMenuLoaded = uiStore.menuItems.length > 0;
  const isInstalled = uiStore.modules.includes(MODULE_ID);

  return (
    <PageLayout
      title={t('matter.title')}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={!isMenuLoaded}
      errors={isMenuLoaded && !isInstalled
        ? [{ variant: 'danger', text: t('matter.labels.unavailable') }]
        : []}
      actions={isInstalled ? <Tag variant="warn">{t('matter.labels.example')}</Tag> : undefined}
    >
      {isInstalled && (
        <>
          <p className="matter-subtitle">{t('matter.labels.subtitle')}</p>

          <Alert variant="info" size="small" className="matter-alert">
            {t('matter.labels.example-notice')}
          </Alert>

          <Card className="matter-card" heading={t('matter.labels.pairing')}>
            <div className="matter-pairing">
              <div className="matter-qr">
                <ExampleQr className="matter-qrImage" role="img" aria-label={t('matter.labels.qr-alt')} />
              </div>

              <div className="matter-pairingBody">
                <ol className="matter-steps">
                  <li>{t('matter.labels.step-app')}</li>
                  <li>{t('matter.labels.step-add')}</li>
                  <li>{t('matter.labels.step-scan')}</li>
                </ol>

                <div className="matter-fields">
                  <CopyField
                    label={t('matter.labels.manual-code')}
                    text={PAIRING_CODE_GROUPED}
                    value={PAIRING_CODE}
                  />
                  <CopyField
                    label={t('matter.labels.payload')}
                    text={PAIRING_PAYLOAD}
                    value={PAIRING_PAYLOAD}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="matter-card" heading={t('matter.labels.ecosystems')}>
            <p className="matter-empty">{t('matter.labels.ecosystems-empty')}</p>
            <p className="matter-hint">{t('matter.labels.ecosystems-hint')}</p>
          </Card>

          <p className="matter-footnote">
            {t('matter.labels.devices-hint')}
            {' '}
            <Link to="/configurator">{t('matter.labels.devices-link')}</Link>
          </p>
        </>
      )}
    </PageLayout>
  );
});

export default MatterPage;
