import { observer } from 'mobx-react-lite';
import { Loader } from '@/components/loader';
import type { GatewayStore } from '@/stores/dali';
import { LunatoneGatewayField } from './lunatone-gateway-field';

export const GatewayTabContent = observer(({ store }: { store: GatewayStore }) => {

  if (store.isLoading) {
    return (
      <div className="dali-contentLoader">
        <Loader />
      </div>
    );
  }

  return <LunatoneGatewayField store={store} />;
});
