import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import i18n from '@/i18n/config';

export const usePreventLeavePage = (confirmMessage: string = i18n.t('common.prompt.dirty')) => {
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(isDirty);
  const confirmMessageRef = useRef(confirmMessage);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    confirmMessageRef.current = confirmMessage;
  }, [confirmMessage]);

  // browser refresh / tab close
  useEffect(() => {
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;

      ev.preventDefault();
      ev.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;

    const confirmed = window.confirm(
      i18n.t(confirmMessageRef.current),
    );

    if (confirmed) {
      isDirtyRef.current = false;
      setIsDirty(false);

      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  return { isDirty, setIsDirty };
};
