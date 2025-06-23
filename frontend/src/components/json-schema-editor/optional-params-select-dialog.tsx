import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { Dialog, DialogTitle } from '@/components/dialog';
import { OptionalParamsSelectDialogProps } from './types';
import './styles.css';

export const OptionalParamsSelectDialog = observer(
  ({ isOpened, store, translator, onClose }: OptionalParamsSelectDialogProps) => {
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language;

    return (
      <Dialog isOpened={isOpened} closedby="any" onClose={onClose}>
        <DialogTitle text={t('json-editor.labels.select-params')} />
        <div className="wb-jsonEditor-optionalParamsList">
          {store.params.map((param) => (
            param.hasPermanentEditor ?
              null :
              <Checkbox
                checked={param.store.value !== undefined}
                title={translator.find(param.store.schema.title || param.key, currentLanguage)}
                onChange={(value) => {
                  if (value) {
                    param.enable();
                  } else {
                    param.disable();
                  }
                }}
              />
          ))}
        </div>
      </Dialog>
    );
  });
