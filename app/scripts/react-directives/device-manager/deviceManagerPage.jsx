import React from 'react';
import { observer } from 'mobx-react-lite';
import NewDevicesScanPage from './scan/newDevicesScanPage.jsx';
import ConfigEditorPage from './config-editor/configEditorPage.jsx';
import SearchDisconnectedScanPage from './scan/searchDisconnectedScanPage.jsx';

const DeviceManagerPage = observer(({ pageStore }) => {
  if (pageStore.newDevicesScanPageStore.active) {
    return <NewDevicesScanPage pageStore={pageStore.newDevicesScanPageStore} />;
  }
  if (pageStore.searchDisconnectedScanPageStore.active) {
    return <SearchDisconnectedScanPage pageStore={pageStore.searchDisconnectedScanPageStore} />;
  }
  return (
    <ConfigEditorPage
      pageStore={pageStore.configEditorPageStore}
      onAddWbDevice={() => pageStore.addWbDevice()}
      onSearchDisconnectedDevice={() => pageStore.searchDisconnectedDevice()}
    />
  );
});

function CreateDeviceManagerPage({ pageStore }) {
  return <DeviceManagerPage pageStore={pageStore} />;
}

export default CreateDeviceManagerPage;
