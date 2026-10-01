import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import i18n from '@/i18n/config';

export const usePreventLeavePage = (confirmMessage: string = i18n.t('common.prompt.dirty')) => {
  const [isDirty, setIsDirtyState] = useState(false);
  // The blocker reads this ref instead of React state so that a navigate()
  // issued right after setIsDirty(false) (same tick, before re-render) is not blocked.
  const isDirtyRef = useRef(false);
  const confirmMessageRef = useRef(confirmMessage);

  const setIsDirty = useCallback((value: boolean) => {
    isDirtyRef.current = value;
    setIsDirtyState(value);
  }, []);

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

  const shouldBlock = useCallback(() => isDirtyRef.current, []);
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;

    const confirmed = window.confirm(
      i18n.t(confirmMessageRef.current),
    );

    if (confirmed) {
      setIsDirty(false);
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, setIsDirty]);

  return { isDirty, setIsDirty };
};
