import React from 'react';
import { observer } from 'mobx-react-lite';
import NewDevicesScanPage from './scan/newDevicesScanPage.jsx';
import ConfigEditorPage from './config-editor/configEditorPage.jsx';

const DeviceManagerPage = observer(({ pageStore }) => {
  if (pageStore.newDevicesScanPageStore.active) {
    return <NewDevicesScanPage pageStore={pageStore.newDevicesScanPageStore} />;
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
