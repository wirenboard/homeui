import { makeAutoObservable } from 'mobx';
import i18n from '~/i18n/react/config';
import { type GlobalError } from './types';

export class GlobalErrorStore {
  public error: string = '';

  constructor() {
    makeAutoObservable(this);
  }

  setError(error: GlobalError | string) {
    if (typeof error === 'string') {
      this.error = error;
      return;
    }

    if (typeof error !== 'object') {
      return;
    }

    if (!Object.hasOwn(error, 'id')) {
      this.error = error.message;
      return;
    }

    if (
      error.id === 'com.wb.device_manager.failed_to_scan_error' &&
      error.metadata &&
      error.metadata.failed_ports
    ) {
      this.error = i18n.t(error.id, {
        defaultValue: error.message,
        replace: {
          failed_ports: error.metadata.failed_ports.join(', '),
        },
        interpolation: { escapeValue: false },
      });
      return;
    }
    this.error = i18n.t(error.id, error.message) as any;
  }

  clearError() {
    this.setError('');
  }
}
