import { observer } from 'mobx-react-lite';
import { Loader } from '@/components/loader';
import type { GatewayStore } from '@/stores/dali';
import { LunatoneGatewayField } from './lunatone-gateway-field';

// In the WASM editor this module is replaced wholesale at build time (see
// redirectHomeuiModules in the editor's vite.config.ts) — that substitution is
// the one seam for host adaptation of this tab, so no capability flag guards
// the emulator field here.
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
