// Sends a fire-and-forget audit log entry to the backend.
// Uses POST /audit-log. Failures are silently ignored
// to ensure logging never breaks main functionality.
import { request } from './request';

export function logAction(action: string, argument: string, type = 'action'): void {
  request.post('/audit-log', {
    action,
    argument: {
      type,
      text: argument,
    },
  }).catch(() => {});
}
