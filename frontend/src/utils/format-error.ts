import { type RpcErrorCode } from '@/common/constants';

interface RpcError {
  code: RpcErrorCode;
  message?: string;
  data: string | { message: string };
}

export const formatError = (error: unknown) :string => {
  if (typeof error === 'object') {
    const rpcError = error as RpcError;
    if (rpcError.code) {
      if (typeof rpcError.data === 'object' && rpcError.data !== null) {
        return `${rpcError.message}: ${rpcError.data.message}(${rpcError.code})`;
      }
      return `${rpcError.message}: ${rpcError.data}(${rpcError.code})`;
    }
    return rpcError.message as string ?? '';
  }
  return String(error);
};
