import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { getI18n, useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { OptionalParamsSelectDialogProps } from './types';

export const OptionalParamsSelectDialog = observer(
  ({ isOpened, store, translator, onClose }: OptionalParamsSelectDialogProps) => {
    const { t } = useTranslation();
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);

    const [allowClose, setAllowClose] = useState(false);

    const lang = getI18n().language;

    useEffect(() => {
      if (dialogRef.current) {
        if (isOpened) {
          dialogRef.current.showModal();
          setAllowClose(true);
        } else {
          setAllowClose(false);
          dialogRef.current.close();
        }
      }

      return () => {
        if (dialogRef.current) {
          setAllowClose(false);
          dialogRef.current.close();
        }
      };
    }, [dialogRef, isOpened]);

    const handleClick = (event: MouseEvent) => {
      if (allowClose && contentRef.current && !contentRef.current.contains(event.target as HTMLElement)) {
        event.stopPropagation();
        event.preventDefault();
        dialogRef.current?.close();
      }
    };

    useEffect(() => {
      document.addEventListener('click', handleClick);

      return () => {
        document.removeEventListener('click', handleClick);
      };
    });

    return (
      <dialog className="dialog" ref={dialogRef} onClose={onClose}>
        {isOpened && (
          <div ref={contentRef} className="dialog-content">
            <h3 className="dialog-title">{t('json-editor.labels.select-params')}</h3>
            <div>
              {store.params.map((param) => (
                param.hasPermanentEditor ?
                  null :
                  <Checkbox
                    checked={param.store.value !== undefined}
                    title={translator.find(param.store.schema.title || param.key, lang)}
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
          </div>
        )}
      </dialog>
    );
  });
