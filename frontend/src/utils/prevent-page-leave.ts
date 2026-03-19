import { useEffect, useRef, useState } from 'react';
import i18n from '~/i18n/react/config';

export const usePreventLeavePage = (transitions) => {
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

    // TODO: move from transitions to react router useBlocker
    const unsubscribe = transitions.onBefore({}, () => {
      if (isDirtyRef.current) {
        if (!confirm(i18n.t('common.prompt.dirty'))) {
          return false;
        }

        setIsDirty(false);
        return true;
      } else {
        setIsDirty(false);
        return true;
      }
    });

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      unsubscribe();
    };
  }, []);

  return { isDirty, setIsDirty };
};
