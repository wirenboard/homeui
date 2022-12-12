import React from 'react';
import { observer } from "mobx-react-lite"
import { useMediaQuery } from 'react-responsive'
import DevicesTable from './desktop';
import DevicesList from './mobile';
import { useTranslation } from 'react-i18next'; 

const Desktop = ({ children }) => {
  const isDesktop = useMediaQuery({ minWidth: 874 })
  return isDesktop ? children : null
}
const Mobile = ({ children }) => {
  const isMobile = useMediaQuery({ maxWidth: 873 })
  return isMobile ? children : null
}

function ScanButton({scanning, onStartScanning}) {
  const { t } = useTranslation();
  return (
    <button disabled={scanning} className='btn btn-default pull-right' onClick={onStartScanning}>
      {t('device-manager.buttons.scan')}
    </button>
  )
}

function Header(params) {
  const { t } = useTranslation();
  return (
    <h1>
        {t('device-manager.title')}
        <ScanButton {...params}/>
    </h1>
  );
}

function ScanProgressBar({scanning, progress}) {
  if (scanning) {
    return (
      <div className='progress scan-progress'>
        <div className='progress-bar' role='progressbar'
          aria-valuenow={progress} aria-valuemin='0' aria-valuemax='100' style={{width: progress + '%'}}>
        </div>
      </div>
    );
  }
  return <div className='separator'></div>
}

const DevicesPage = observer(({scanning, devices}) => {
  return (
    <>
      <Header scanning={scanning.scanning} onStartScanning={() => scanning.startScan()}/>
      <ScanProgressBar scanning={scanning.scanning} progress={scanning.progress}/>
      <Desktop>
        <DevicesTable devices={devices.devices}/>
      </Desktop>
      <Mobile>
        <DevicesList devices={devices.devices}/>
      </Mobile>
    </>
  );
})

export default DevicesPage;
