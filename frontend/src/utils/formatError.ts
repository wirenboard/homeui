import { RpcError } from './types';

export const formatError = (error: unknown) => {
  if (typeof error === 'object') {
    const rpcError = error as RpcError;
    if (rpcError.code) {
      return `${rpcError.message}: ${rpcError.data}(${rpcError.code})`;
    }
    return rpcError.message;
  }
  return String(error);
};
