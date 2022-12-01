import React from 'react';
import { useTranslation } from 'react-i18next'; 

function WarningBox(props) {
    return <span className='tag bg-warning'>{props.text}</span>;
}

function ErrorBox(props) {
    return <span className='tag bg-danger'>{props.text}</span>;
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
        const text = props.version + ' (' + t('available') + ' ' + props.update.available_fw + ')'
        return <td className='cell-with-warning'><WarningBox text={text}/></td>;
    }
    return <td>{props.version}</td>;
}

function ErrorRow(props) {
  return (
    <tr>
      <td colSpan='5'>
        <div className='tag bg-danger'>{props.error}</div>
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

function DevicesTable(props) {
    const { t } = useTranslation();
    const devices = props.devices || [];
    const rows = devices.map((d) => DeviceRow(d));
    return (
        <table className='table table-bordered'>
            <thead>
                <tr>
                    <td>{t('device')}</td>
                    <td>{t('address')}</td>
                    <td>{t('port')}</td>
                    <td>{t('settings')}</td>
                    <td>{t('firmware')}</td>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
    );
}

function ProgressBar(props) {
  return (
    <div className='progress'>
      <div className='progress-bar progress-bar-striped active' role='progressbar'
        aria-valuenow={props.progress} aria-valuemin='0' aria-valuemax='100' style={{minWidth: '2em', width: props.progress + '%'}}>
          {props.progress}%
      </div>
    </div>
  ); 
}

// Expected props structure
//
// {
//   "progress": 15,
//   "scanning": false,
//   "devices": [
//     {
//       "uuid": "05a822a1-f326-3dbe-9dad-56921ecfa0f1",
//       "port": {
//         "path": "/dev/ttyRS485-1"
//       },
//       "title": "Scanned device",
//       "sn": "4264834454",
//       "online": true,
//       "poll": false,
//       "bootloader_mode": false,
//       "error": null,
//       "cfg": {
//         "slave_id": 3,
//         "baud_rate": 9600,
//         "parity": "N",
//         "data_bits": 8,
//         "stop_bits": 2
//       },
//       "fw": {
//         "version": "3.3.1",
//         "update": {
//           "progress": 0,
//           "error": null,
//           "available_fw": null
//         }
//       }
//     },
//     ...
//   ]
// }

function DevicesPage(props) {
  return (
    <>
      {props.scanning && <ProgressBar progress={props.progress}/>}
      <DevicesTable {...props}/>
    </>
  );
}

export default DevicesPage;
