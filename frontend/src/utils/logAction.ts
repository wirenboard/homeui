// Sends a fire-and-forget audit log entry to the backend.
// Uses POST /audit-log. Failures are silently ignored
// to ensure logging never breaks main functionality.
import { request } from './request';

export function logAction(eventText: string, scope = 'action'): void {
  request.post('/audit-log', {
    scope,
    event: {
      text: eventText,
    },
  }).catch(() => {});
}
