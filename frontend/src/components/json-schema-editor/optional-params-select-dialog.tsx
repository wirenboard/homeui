import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { Dialog } from '@/components/dialog';
import type { OptionalParamsSelectDialogProps } from './types';
import './styles.css';

export const OptionalParamsSelectDialog = observer(
  ({ isOpened, store, translator, onClose }: OptionalParamsSelectDialogProps) => {
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language;

    return (
      <Dialog isOpened={isOpened} heading={t('json-editor.labels.select-params')} onClose={onClose}>
        <div className="wb-jsonEditor-optionalParamsList">
          {store.params.map((param) => (
            param.hasPermanentEditor || param.hidden ?
              null :
              <Checkbox
                checked={!param.disabled}
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
