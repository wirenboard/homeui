import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { MakeFormFields } from '@/components/json-editor/forms';

interface PortContentProps {
  params: Record<string, any>;
  conflictPortNames: string[];
  onDelete?: () => void;
}

export const PortContent = ({ params, conflictPortNames, onDelete }: PortContentProps) => {
  const { t } = useTranslation();
  return (
    <>
      {!!conflictPortNames.length && (
        <Alert variant="danger" className="mbgate-portConflict">
          {t('mbgate.errors.port-conflict', {
            ports: conflictPortNames.map((name) => `«${name}»`).join(', '),
          })}
        </Alert>
      )}
      {onDelete && (
        <div className="mbgate-portName">
          <div className="form-content">
            {MakeFormFields([['name', params.name]])}
          </div>
          <Button
            label={t('mbgate.buttons.delete-port')}
            variant="danger"
            aria-haspopup="dialog"
            onClick={onDelete}
          />
        </div>
      )}
      <div className="form-content">
        {MakeFormFields([['modbus', params.modbus], ['registers', params.registers]])}
      </div>
    </>
  );
};
