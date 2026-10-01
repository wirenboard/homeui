import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Alert } from '@/components/alert';
import { Card } from '@/components/card';
import { Confirm } from '@/components/confirm';
import { Table, TableCell, TableRow } from '@/components/table';
import { type SetupAddressModalProps } from './types';
import './styles.css';

export const SetupAddressModal = ({ isOpened, devices, onConfirm, onClose }: SetupAddressModalProps) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery({ minWidth: 874 });

  return (
    <Confirm
      isOpened={isOpened}
      heading={t('device-manager.labels.address-conflicts')}
      acceptLabel={t('common.buttons.apply')}
      width={1024}
      confirmCallback={() => onConfirm(devices)}
      closeCallback={() => onClose(false)}
    >
      {isDesktop ? (
        <Table>
          <TableRow isHeading>
            <TableCell>{t('scan.labels.device')}</TableCell>
            <TableCell>{t('scan.labels.sn')}</TableCell>
            <TableCell>{t('scan.labels.port')}</TableCell>
            <TableCell>{t('scan.labels.address')}</TableCell>
          </TableRow>
          {devices.map((device, index) => (
            <TableRow key={index}>
              <TableCell>{device.title}</TableCell>
              <TableCell>{device.sn}</TableCell>
              <TableCell>{device.port}</TableCell>
              <TableCell>{device.address} &rArr; <b>{device.newAddress}</b></TableCell>
            </TableRow>
          ))}
        </Table>
      ) : (
        <div className="setupAddressModal-container">
          {devices.map((device, index) => (
            <Card heading={device.title} variant="secondary" className="setupAddressModal-card" key={index}>
              <div className="setupAddressModal-mobileData">
                <div>SN</div>
                <div>{device.sn}</div>
              </div>
              <div className="setupAddressModal-mobileData">
                <div>{t('scan.labels.port')}</div>
                <div>{device.port}</div>
              </div>
              <div className="setupAddressModal-mobileData">
                <div>{t('scan.labels.address')}</div>
                <div>{device.address} &rArr; <b>{device.newAddress}</b></div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Alert variant="info" className="setupAddressModal-alert" size="small">
        {t('device-manager.labels.address-conflicts-note')}
      </Alert>
    </Confirm>
  );
};
