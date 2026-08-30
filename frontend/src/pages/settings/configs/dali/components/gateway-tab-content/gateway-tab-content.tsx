import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Loader } from '@/components/loader';
import type { GatewayStore } from '@/stores/dali';
import { daliHostCapabilities } from '@/stores/dali/host-capabilities';
import { LunatoneGatewayField } from './lunatone-gateway-field';

export const GatewayTabContent = observer(({ store }: { store: GatewayStore }) => {
  const { t } = useTranslation();

  if (store.isLoading) {
    return (
      <div className="dali-contentLoader">
        <Loader />
      </div>
    );
  }

  if (!daliHostCapabilities.lunatoneEmulator) {
    // The emulator toggle is the gateway tab's only content, and a host that
    // cannot open a server socket switches it off — only the WASM editor does,
    // so the fallback hint may live in its translation namespace.
    return <p>{t('dali-wasm.labels.gateway-hint')}</p>;
  }

  return <LunatoneGatewayField store={store} />;
});
