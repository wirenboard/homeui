import React from 'react';
import { useTranslation } from 'react-i18next'; 
import { observer } from "mobx-react-lite"

function WarningBox({text}) {
    return <span className='tag bg-warning'>{text}</span>;
}

function ErrorBox({text}) {
    return <span className='tag bg-danger'>{text}</span>;
}

function DeviceNameCell(props) {
    return ( 
        <td>
            <div className='pull-left'>
                <b>{props.title}</b>({props.sn})
            </div>
            <div className='pull-right'>
                {props.bootloader_mode && <ErrorBox text="in bootloder"/>}
                {!props.online && <ErrorBox text="offline"/>}
                {!props.poll && <WarningBox text="not polled"/>}
            </div>
        </td>
    );
}

function PortSettingsCell(props) {
    return <td>{props.baude_rate} {props.data_bits.toString()}{props.parity}{props.stop_bits.toString()}</td>;
}

function FirmwareCell(props) {
  const { t } = useTranslation();
    if (props.update && props.update.available_fw) {
        const text = props.version + ' (' + t('device-manager.table.available') + ' ' + props.update.available_fw + ')'
        return <td className='cell-with-warning'><WarningBox text={text}/></td>;
    }
    return <td>{props.version}</td>;
}

function ErrorRow({error}) {
  return (
    <tr>
      <td colSpan='5'>
        <div className='tag bg-danger'>{error}</div>
      </td>
    </tr>
  );
}

function DeviceRow(props) {
    var error
    if (props.fw && props.fw.update) 
      error = props.fw.update.error
    if (props.error)
      error = props.error 
    return (
      <React.Fragment key={props.uuid}>
        <tr className={error && 'row-with-error'}>
            <DeviceNameCell {...props} />
            <td>{props.cfg.slave_id}</td>
            <td>{props.port.path}</td>
            <PortSettingsCell {...props.cfg} />
            <FirmwareCell {...props.fw} />
        </tr>
        {error && <ErrorRow error={error}/>}
      </React.Fragment>
    );
}

function DevicesTable({devices}) {
    const { t } = useTranslation();
    const rows = devices.map((d) => DeviceRow(d));
    return (
        <table className='table table-bordered'>
            <thead>
                <tr>
                    <td>{t('device-manager.table.device')}</td>
                    <td>{t('device-manager.table.address')}</td>
                    <td>{t('device-manager.table.port')}</td>
                    <td>{t('device-manager.table.settings')}</td>
                    <td>{t('device-manager.table.firmware')}</td>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
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

function Header({scanning, onStartScanning}) {
  const { t } = useTranslation();
  return (
    <h1 className='page-header'>
        {t('device-manager.title')}
        <button disabled={scanning} className='btn btn-success pull-right' onClick={onStartScanning} >
            {t('device-manager.buttons.scan')}
        </button>
    </h1>
  );
}

const DevicesPage = observer(({scanning, devices}) => {
  return (
    <>
      <Header scanning={scanning.scanning} onStartScanning={() => scanning.startScan()}/>
      {scanning.scanning && <ProgressBar progress={scanning.progress}/>}
      <DevicesTable devices={devices.devices}/>
    </>
  );
})

export default DevicesPage;
