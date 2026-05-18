import { useEffect, useRef, useState } from 'react';
import i18n from '~/i18n/react/config';

export const usePreventLeavePage = (rootScope: any) => {
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        ev.preventDefault();
        ev.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // TODO: move from $locationChangeStart to react router useBlocker
    const unsubscribe = rootScope.$on(
      '$locationChangeStart',
      (event: any, newUrl: string) => {
        if (!isDirtyRef.current) return;

        event.preventDefault();

        if (confirm(i18n.t('common.prompt.dirty'))) {
          isDirtyRef.current = false;
          setIsDirty(false);
          window.location.assign(newUrl);
        }
      },
    );

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      unsubscribe();
    };
  }, []);

  return { isDirty, setIsDirty };
};
