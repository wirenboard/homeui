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

function Header({scanning, onStartScanning}) {
  const { t } = useTranslation();
  return (
    <h1 className='page-header'>
        {t('device-manager.title')}
        <button disabled={scanning} className='btn btn-default pull-right' onClick={onStartScanning} >
            {t('device-manager.buttons.scan')}
        </button>
    </h1>
  );
}

function ProgressBar({progress}) {
  return (
    <div className='progress'>
      <div className='progress-bar progress-bar-striped active' role='progressbar'
        aria-valuenow={progress} aria-valuemin='0' aria-valuemax='100' style={{minWidth: '2em', width: progress + '%'}}>
          {progress}%
      </div>
    </div>
  ); 
}

const DevicesPage = observer(({scanning, devices}) => {
  return (
    <>
      <Header scanning={scanning.scanning} onStartScanning={() => scanning.startScan()}/>
      {scanning.scanning && <ProgressBar progress={scanning.progress}/>}
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
