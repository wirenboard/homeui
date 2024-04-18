import React from 'react';
import { observer } from 'mobx-react-lite';
import ScanPage from './scan/scan.jsx';
import ConfigEditorPage from './config-editor/configEditorPage.jsx';

const DeviceManagerPage = observer(({ pageStore }) => {
  if (pageStore.showScan) {
    return (
      <ScanPage
        pageStore={pageStore.scanPageStore}
        onCancel={() => pageStore.cancelAddingDevices()}
      />
    );
  }
  return (
    <ConfigEditorPage
      pageStore={pageStore.configEditorPageStore}
      onAddWbDevice={() => pageStore.addWbDevice()}
    />
  );
});

function CreateDeviceManagerPage({ pageStore }) {
  return <DeviceManagerPage pageStore={pageStore} />;
}

export default CreateDeviceManagerPage;
