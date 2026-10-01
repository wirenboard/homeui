import { createRpcProxy } from './rpc';

interface DiagnosticProxyMethods {
  diag: () => Promise<void>;
  status: () => Promise<string>;
}

export const diagnosticProxy = createRpcProxy<DiagnosticProxyMethods>(
  'diag/main',
  ['diag', 'status'],
);
